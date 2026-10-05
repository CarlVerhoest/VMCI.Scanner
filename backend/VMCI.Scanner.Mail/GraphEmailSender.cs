using System.Net.Http.Headers;
using System.Net.Http.Json;
using System.Text.Json;
using System.Text.Json.Nodes;
using Azure.Core;
using Microsoft.Extensions.Logging;

namespace VMCI.Scanner.Mail;

/// <summary>What <see cref="GraphEmailSender"/> needs besides its HttpClient. Not a bare TokenCredential in DI, so nothing else picks it up by accident.</summary>
public sealed record GraphMailSettings(TokenCredential Credential, string SenderAddress);

/// <summary>
/// Sends as the shared mailbox through Microsoft Graph, app-only. Plain HTTP against four endpoints rather
/// than the Graph SDK: the whole surface used is below.
///
/// <para><b>Two paths, because of a Graph request limit.</b> <c>sendMail</c> takes the attachment inline,
/// base64, in a request of at most 4 MB — about 3 MB of PDF. A larger PDF goes as a draft
/// (<c>POST /messages</c>), an attachment upload session in chunks, then <c>/send</c>. The draft path needs
/// <c>Mail.ReadWrite</c> on the mailbox as well as <c>Mail.Send</c>; both are Exchange RBAC roles scoped
/// to that one mailbox (docs/mail-setup.md). A draft left behind by a failure is deleted.</para>
///
/// <para>Every sent mail is saved in the mailbox's Sent Items.</para>
/// </summary>
public sealed class GraphEmailSender : IEmailSender
{
    public const string GraphBaseAddress = "https://graph.microsoft.com/v1.0/";
    public const string GraphScope = "https://graph.microsoft.com/.default";

    /// <summary>Largest attachment sent inline. Graph documents "under 3 MB"; base64 adds a third, the request cap is 4 MB.</summary>
    public const int InlineAttachmentLimit = 3_000_000;

    /// <summary>Upload-session chunk size. Graph allows at most 4 MB per chunk.</summary>
    public const int UploadChunkSize = 3 * 1024 * 1024;

    private const string PdfContentType = "application/pdf";

    private readonly HttpClient _http;
    private readonly GraphMailSettings _settings;
    private readonly ILogger<GraphEmailSender> _logger;

    public GraphEmailSender(HttpClient http, GraphMailSettings settings, ILogger<GraphEmailSender> logger)
    {
        _http = http;
        _settings = settings;
        _logger = logger;
    }

    private string Mailbox => $"users/{Uri.EscapeDataString(_settings.SenderAddress)}";

    public async Task SendAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        if (message.Attachment.Length <= InlineAttachmentLimit)
        {
            await SendInlineAsync(message, cancellationToken);
        }
        else
        {
            await SendWithUploadSessionAsync(message, cancellationToken);
        }
    }

    private async Task SendInlineAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        var mail = MessageJson(message);
        mail["attachments"] = new JsonArray(new JsonObject
        {
            ["@odata.type"] = "#microsoft.graph.fileAttachment",
            ["name"] = message.AttachmentName,
            ["contentType"] = PdfContentType,
            ["contentBytes"] = Convert.ToBase64String(message.Attachment),
        });

        var payload = new JsonObject { ["message"] = mail, ["saveToSentItems"] = true };
        using var response = await SendGraphAsync(HttpMethod.Post, $"{Mailbox}/sendMail", payload, cancellationToken);
        await EnsureSuccessAsync(response, "sendMail", cancellationToken);
    }

    private async Task SendWithUploadSessionAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        string draftId;
        using (var created = await SendGraphAsync(HttpMethod.Post, $"{Mailbox}/messages", MessageJson(message), cancellationToken))
        {
            await EnsureSuccessAsync(created, "create draft", cancellationToken);
            draftId = (await ReadJsonAsync(created, cancellationToken))["id"]?.GetValue<string>()
                ?? throw new EmailSendException("Graph create draft: the response has no message id.");
        }

        var sent = false;
        try
        {
            var draft = $"{Mailbox}/messages/{Uri.EscapeDataString(draftId)}";
            var session = new JsonObject
            {
                ["AttachmentItem"] = new JsonObject
                {
                    ["attachmentType"] = "file",
                    ["name"] = message.AttachmentName,
                    ["size"] = message.Attachment.Length,
                    ["contentType"] = PdfContentType,
                },
            };

            string uploadUrl;
            using (var opened = await SendGraphAsync(HttpMethod.Post, $"{draft}/attachments/createUploadSession", session, cancellationToken))
            {
                await EnsureSuccessAsync(opened, "createUploadSession", cancellationToken);
                uploadUrl = (await ReadJsonAsync(opened, cancellationToken))["uploadUrl"]?.GetValue<string>()
                    ?? throw new EmailSendException("Graph createUploadSession: the response has no uploadUrl.");
            }

            await UploadAsync(new Uri(uploadUrl), message.Attachment, cancellationToken);

            using (var send = await SendGraphAsync(HttpMethod.Post, $"{draft}/send", null, cancellationToken))
            {
                await EnsureSuccessAsync(send, "send draft", cancellationToken);
            }
            sent = true;
        }
        finally
        {
            if (!sent)
            {
                await DeleteDraftAsync(draftId);
            }
        }
    }

    /// <summary>
    /// PUTs the attachment in chunks. The upload URL is pre-authorised: it must NOT carry the bearer token
    /// (Graph rejects the request if it does).
    /// </summary>
    private async Task UploadAsync(Uri uploadUrl, byte[] content, CancellationToken cancellationToken)
    {
        for (var start = 0; start < content.Length; start += UploadChunkSize)
        {
            var length = Math.Min(UploadChunkSize, content.Length - start);
            using var request = new HttpRequestMessage(HttpMethod.Put, uploadUrl)
            {
                Content = new ByteArrayContent(content, start, length),
            };
            request.Content.Headers.ContentType = new MediaTypeHeaderValue("application/octet-stream");
            request.Content.Headers.ContentRange = new ContentRangeHeaderValue(start, start + length - 1, content.Length);

            using var response = await _http.SendAsync(request, cancellationToken);
            await EnsureSuccessAsync(response, $"upload bytes {start}-{start + length - 1}", cancellationToken);
        }
    }

    private async Task DeleteDraftAsync(string draftId)
    {
        try
        {
            // Not the caller's token: the send may have been cancelled, and the draft should still go.
            using var response = await SendGraphAsync(HttpMethod.Delete, $"{Mailbox}/messages/{Uri.EscapeDataString(draftId)}", null, CancellationToken.None);
            if (!response.IsSuccessStatusCode)
            {
                _logger.LogWarning("Deleting the unsent draft in {Mailbox} failed: HTTP {Status}", _settings.SenderAddress, (int)response.StatusCode);
            }
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "Deleting the unsent draft in {Mailbox} failed", _settings.SenderAddress);
        }
    }

    private static JsonObject MessageJson(EmailMessage message) => new()
    {
        ["subject"] = message.Subject,
        ["body"] = new JsonObject { ["contentType"] = "Text", ["content"] = message.Body },
        ["toRecipients"] = new JsonArray(new JsonObject
        {
            ["emailAddress"] = new JsonObject { ["address"] = message.To },
        }),
    };

    private async Task<HttpResponseMessage> SendGraphAsync(HttpMethod method, string path, JsonNode? body, CancellationToken cancellationToken)
    {
        var token = await _settings.Credential.GetTokenAsync(new TokenRequestContext([GraphScope]), cancellationToken);

        using var request = new HttpRequestMessage(method, path);
        request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", token.Token);
        // A POST without a body (/send) still needs Content-Length: 0, or Graph answers 411.
        request.Content = body != null ? JsonContent.Create(body)
            : method == HttpMethod.Delete ? null
            : new ByteArrayContent([]);

        return await _http.SendAsync(request, cancellationToken);
    }

    private static async Task<JsonNode> ReadJsonAsync(HttpResponseMessage response, CancellationToken cancellationToken) =>
        await response.Content.ReadFromJsonAsync<JsonNode>(cancellationToken)
            ?? throw new EmailSendException("Graph returned an empty response.");

    /// <summary>
    /// Turns a Graph failure into an exception naming the step, the status and Graph's error code and message.
    /// A 403 here almost always means the Exchange role assignment is missing or not yet out of the
    /// permission cache (up to two hours) — see docs/mail-setup.md, step 6.
    /// </summary>
    private static async Task EnsureSuccessAsync(HttpResponseMessage response, string step, CancellationToken cancellationToken)
    {
        if (response.IsSuccessStatusCode)
        {
            return;
        }

        string detail;
        try
        {
            var error = (await response.Content.ReadFromJsonAsync<JsonNode>(cancellationToken))?["error"];
            detail = $"{error?["code"]?.GetValue<string>()}: {error?["message"]?.GetValue<string>()}";
        }
        catch (JsonException)
        {
            detail = "(no JSON error body)";
        }

        throw new EmailSendException($"Graph {step} failed with HTTP {(int)response.StatusCode} {detail}");
    }
}

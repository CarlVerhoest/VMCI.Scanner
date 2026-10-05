using System.Net;
using System.Text;
using System.Text.Json.Nodes;
using Azure.Core;
using Microsoft.Extensions.Logging.Abstractions;
using VMCI.Scanner.Mail;

namespace VMCI.Scanner.Tests.Unit.Mail;

// Graph is faked at the HTTP level: each test scripts the answers and then reads back what was sent.
public class GraphEmailSenderTests
{
    private const string Sender = "noreply@vmci.be";
    private const string Mailbox = "/v1.0/users/noreply%40vmci.be";
    private const string UploadUrl = "https://outlook.office.com/api/v2.0/upload/session-1?authtoken=abc";

    private sealed class FakeCredential : TokenCredential
    {
        public override AccessToken GetToken(TokenRequestContext requestContext, CancellationToken cancellationToken) =>
            new("test-token", DateTimeOffset.UtcNow.AddHours(1));

        public override ValueTask<AccessToken> GetTokenAsync(TokenRequestContext requestContext, CancellationToken cancellationToken) =>
            ValueTask.FromResult(GetToken(requestContext, cancellationToken));
    }

    private sealed record Recorded(HttpMethod Method, Uri Uri, string? Authorization, string? ContentRange, byte[] Body);

    private sealed class FakeGraph(Func<HttpRequestMessage, HttpResponseMessage> respond) : HttpMessageHandler
    {
        public List<Recorded> Requests { get; } = [];

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            var body = request.Content == null ? [] : await request.Content.ReadAsByteArrayAsync(cancellationToken);
            Requests.Add(new Recorded(
                request.Method,
                request.RequestUri!,
                request.Headers.Authorization?.ToString(),
                request.Content?.Headers.ContentRange?.ToString(),
                body));
            return respond(request);
        }
    }

    private static HttpResponseMessage Json(HttpStatusCode status, string json) =>
        new(status) { Content = new StringContent(json, Encoding.UTF8, "application/json") };

    private static (GraphEmailSender Sender, FakeGraph Graph) Create(Func<HttpRequestMessage, HttpResponseMessage> respond)
    {
        var graph = new FakeGraph(respond);
        var http = new HttpClient(graph) { BaseAddress = new Uri(GraphEmailSender.GraphBaseAddress) };
        var sender = new GraphEmailSender(http, new GraphMailSettings(new FakeCredential(), Sender), NullLogger<GraphEmailSender>.Instance);
        return (sender, graph);
    }

    private static EmailMessage Message(int attachmentBytes)
    {
        var pdf = new byte[attachmentBytes];
        new Random(42).NextBytes(pdf);
        return new EmailMessage("boekhouding@example.com", "Factuur oktober", "Body text", "Factuur oktober.pdf", pdf);
    }

    // Answers the large-attachment path the way Graph does: draft, session, chunks, send.
    private static HttpResponseMessage UploadPath(HttpRequestMessage request, HttpStatusCode uploadStatus = HttpStatusCode.OK)
    {
        var path = request.RequestUri!.AbsolutePath;
        return (request.Method.Method, path) switch
        {
            ("POST", Mailbox + "/messages") => Json(HttpStatusCode.Created, """{ "id": "draft-1" }"""),
            ("POST", Mailbox + "/messages/draft-1/attachments/createUploadSession") => Json(HttpStatusCode.OK, $$"""{ "uploadUrl": "{{UploadUrl}}" }"""),
            ("PUT", _) => new HttpResponseMessage(uploadStatus),
            ("POST", Mailbox + "/messages/draft-1/send") => new HttpResponseMessage(HttpStatusCode.Accepted),
            ("DELETE", Mailbox + "/messages/draft-1") => new HttpResponseMessage(HttpStatusCode.NoContent),
            _ => new HttpResponseMessage(HttpStatusCode.NotFound),
        };
    }

    [Fact]
    public async Task SmallPdf_GoesInlineInOneSendMail_SavedToSentItems()
    {
        var (sender, graph) = Create(_ => new HttpResponseMessage(HttpStatusCode.Accepted));
        var message = Message(1_000);

        await sender.SendAsync(message, CancellationToken.None);

        var request = Assert.Single(graph.Requests);
        Assert.Equal(HttpMethod.Post, request.Method);
        Assert.Equal(Mailbox + "/sendMail", request.Uri.AbsolutePath);
        Assert.Equal("Bearer test-token", request.Authorization);

        var json = JsonNode.Parse(request.Body)!;
        Assert.True(json["saveToSentItems"]!.GetValue<bool>());
        var mail = json["message"]!;
        Assert.Equal("Factuur oktober", mail["subject"]!.GetValue<string>());
        Assert.Equal("Text", mail["body"]!["contentType"]!.GetValue<string>());
        Assert.Equal("boekhouding@example.com", mail["toRecipients"]![0]!["emailAddress"]!["address"]!.GetValue<string>());
        var attachment = mail["attachments"]![0]!;
        Assert.Equal("#microsoft.graph.fileAttachment", attachment["@odata.type"]!.GetValue<string>());
        Assert.Equal("Factuur oktober.pdf", attachment["name"]!.GetValue<string>());
        Assert.Equal(message.Attachment, Convert.FromBase64String(attachment["contentBytes"]!.GetValue<string>()));
    }

    [Fact]
    public async Task LargePdf_GoesAsDraftWithUploadSessionInChunks_ThenSends()
    {
        var (sender, graph) = Create(request => UploadPath(request));
        var message = Message(7_500_000);

        await sender.SendAsync(message, CancellationToken.None);

        var steps = graph.Requests.Select(r => $"{r.Method} {(r.Method == HttpMethod.Put ? "upload" : r.Uri.AbsolutePath)}").ToList();
        Assert.Equal(
        [
            $"POST {Mailbox}/messages",
            $"POST {Mailbox}/messages/draft-1/attachments/createUploadSession",
            "PUT upload", "PUT upload", "PUT upload",
            $"POST {Mailbox}/messages/draft-1/send",
        ], steps);

        // The draft carries no inline attachment; the session announces the real size.
        Assert.Null(JsonNode.Parse(graph.Requests[0].Body)!["attachments"]);
        var item = JsonNode.Parse(graph.Requests[1].Body)!["AttachmentItem"]!;
        Assert.Equal(7_500_000, item["size"]!.GetValue<int>());

        var uploads = graph.Requests.Where(r => r.Method == HttpMethod.Put).ToList();
        Assert.All(uploads, u => Assert.Equal(new Uri(UploadUrl), u.Uri));
        Assert.All(uploads, u => Assert.Null(u.Authorization)); // the upload URL is pre-authorised
        Assert.Equal(
            ["bytes 0-3145727/7500000", "bytes 3145728-6291455/7500000", "bytes 6291456-7499999/7500000"],
            uploads.Select(u => u.ContentRange));
        Assert.Equal(message.Attachment, uploads.SelectMany(u => u.Body).ToArray());
    }

    [Fact]
    public async Task LargePdf_UploadFails_DraftIsDeleted_AndTheErrorSaysWhichStep()
    {
        var (sender, graph) = Create(request => UploadPath(request, HttpStatusCode.InternalServerError));

        var error = await Assert.ThrowsAsync<EmailSendException>(() => sender.SendAsync(Message(4_000_000), CancellationToken.None));

        Assert.Contains("upload bytes 0-", error.Message);
        Assert.Contains("500", error.Message);
        Assert.Equal(HttpMethod.Delete, graph.Requests[^1].Method);
        Assert.Equal(Mailbox + "/messages/draft-1", graph.Requests[^1].Uri.AbsolutePath);
        Assert.DoesNotContain(graph.Requests, r => r.Uri.AbsolutePath.EndsWith("/send"));
    }

    [Fact]
    public async Task Forbidden_ReportsGraphsErrorCode()
    {
        var (sender, _) = Create(_ => Json(HttpStatusCode.Forbidden,
            """{ "error": { "code": "ErrorAccessDenied", "message": "Access is denied." } }"""));

        var error = await Assert.ThrowsAsync<EmailSendException>(() => sender.SendAsync(Message(100), CancellationToken.None));

        Assert.Contains("sendMail", error.Message);
        Assert.Contains("403", error.Message);
        Assert.Contains("ErrorAccessDenied", error.Message);
    }
}

using System.Text.Json;
using Anthropic;
using Anthropic.Models.Beta;
using Anthropic.Models.Beta.Messages;
using Microsoft.Extensions.Logging;

namespace VMCI.Scanner.Claude;

/// <summary>Proposes a document name from the text OCR read.</summary>
public interface IDocumentTitleSuggester
{
    /// <summary>Null when no useful name came out; the caller then keeps its own.</summary>
    Task<string?> SuggestAsync(string documentText, CancellationToken cancellationToken);
}

/// <summary>
/// One structured-output request to the Anthropic API. Effort low: reading a supplier, a date and a
/// subject off a page needs no long reasoning. The server-side refusal fallback is on, so a declined
/// request is re-served by another model inside the same call.
/// </summary>
public sealed class AnthropicDocumentTitleSuggester : IDocumentTitleSuggester
{
    private const string Instructions = """
        You name scanned documents for VMCI, a Belgian company. The user message is the text that OCR
        read from one scanned document, possibly with recognition errors. Fill in every field; the
        values are Dutch, as a Belgian accounting department would write them.

        - isInvoice: true for an invoice, credit note, receipt or till ticket - any document that asks
          for or proves a payment. False for anything else.
        - company: for an invoice, the company that issued it (the supplier): the company's own name, in
          full as printed - never abbreviated. Leave out a branch, shop, station or location name
          ("TotalEnergies", not "TotalEnergies Station Gent Ring Oost"). Write a name printed in all
          capitals in its usual spelling ("TOTALENERGIES" becomes "TotalEnergies"). Not VMCI: VMCI is
          usually the customer. Empty for other documents.
        - nature: for an invoice, what the payment is for, in at most two Dutch words, starting with a
          capital letter (for example "Brandstof", "Telefonie", "Kantoormateriaal", "Restaurant",
          "Huur"). Empty for other documents.
        - invoiceDate: for an invoice, the invoice date (not the due date, not the delivery date) as
          YYYY-MM-DD. Empty when there is none or it cannot be read with certainty.
        - title: for any other document, a short descriptive Dutch title of at most six words, without
          a file extension. Empty for an invoice.

        Never guess: leave a field empty rather than invent a value that is not in the text.
        """;

    private static readonly Dictionary<string, JsonElement> Schema = new()
    {
        ["type"] = JsonSerializer.SerializeToElement("object"),
        ["properties"] = JsonSerializer.SerializeToElement(new
        {
            isInvoice = new { type = "boolean" },
            company = new { type = "string" },
            nature = new { type = "string" },
            invoiceDate = new { type = "string" },
            title = new { type = "string" },
        }),
        ["required"] = JsonSerializer.SerializeToElement(new[] { "isInvoice", "company", "nature", "invoiceDate", "title" }),
        ["additionalProperties"] = JsonSerializer.SerializeToElement(false),
    };

    private static readonly JsonSerializerOptions JsonOptions = new() { PropertyNameCaseInsensitive = true };

    private readonly AnthropicClient _client;
    private readonly ClaudeOptions _options;
    private readonly ILogger<AnthropicDocumentTitleSuggester> _logger;

    public AnthropicDocumentTitleSuggester(ClaudeOptions options, ILogger<AnthropicDocumentTitleSuggester> logger)
    {
        if (!options.IsConfigured)
        {
            throw new InvalidOperationException("Anthropic:ApiKey is not configured.");
        }

        _client = new AnthropicClient { ApiKey = options.ApiKey };
        _options = options;
        _logger = logger;
    }

    public async Task<string?> SuggestAsync(string documentText, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(documentText))
        {
            return null;
        }

        var parameters = new MessageCreateParams
        {
            Model = _options.TitleModel,
            MaxTokens = 4096,
            Betas = [AnthropicBeta.ServerSideFallback2026_07_01],
            // "default": the server picks the fallback per refusal category; no model list to maintain.
            Fallbacks = new Default(),
            System = new List<BetaTextBlockParam> { new() { Text = Instructions } },
            Messages = [new() { Role = Role.User, Content = documentText }],
            OutputConfig = new BetaOutputConfig
            {
                Effort = Effort.Low,
                Format = new BetaJsonOutputFormat { Schema = Schema },
            },
        };

        var response = await _client.Beta.Messages.Create(parameters, cancellationToken);
        var stopReason = response.StopReason?.ToString() ?? string.Empty;
        if (stopReason is "refusal" or "max_tokens")
        {
            _logger.LogWarning("Title suggestion stopped with {StopReason}", stopReason);
            return null;
        }

        var json = string.Concat(response.Content.Select(b => b.Value).OfType<BetaTextBlock>().Select(t => t.Text));
        var facts = JsonSerializer.Deserialize<DocumentFacts>(json, JsonOptions);

        // Only the outcome is logged, never the document's content.
        _logger.LogInformation(
            "Title suggested: invoice {IsInvoice}, {InputTokens} input and {OutputTokens} output tokens",
            facts?.IsInvoice, response.Usage.InputTokens, response.Usage.OutputTokens);

        return facts == null ? null : DocumentTitle.Compose(facts);
    }
}

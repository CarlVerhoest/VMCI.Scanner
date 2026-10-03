using Azure;
using Azure.AI.DocumentIntelligence;
using Microsoft.Extensions.Logging;

namespace VMCI.Scanner.Pdf;

/// <summary>Adds an invisible text layer to an image PDF.</summary>
public interface IOcrProvider
{
    Task<byte[]> MakeSearchableAsync(byte[] imagePdf, CancellationToken cancellationToken);
}

public class DocumentIntelligenceOptions
{
    public const string SectionName = "DocumentIntelligence";

    public string Endpoint { get; set; } = string.Empty;

    /// <summary>Secret: backend/secrets/appsettings.secrets.json or an environment variable, never a committed file.</summary>
    public string Key { get; set; } = string.Empty;

    public string ModelId { get; set; } = "prebuilt-read";

    public bool IsComplete =>
        Uri.TryCreate(Endpoint, UriKind.Absolute, out _) && !string.IsNullOrWhiteSpace(Key);
}

/// <summary>
/// Azure Document Intelligence, model <c>prebuilt-read</c> with PDF output: the service returns the
/// same PDF with a text layer. The analysis result is deleted straight after fetching it, so Azure
/// does not keep a copy of the document for its default retention period.
/// </summary>
public class AzureDocumentIntelligenceOcrProvider : IOcrProvider
{
    private readonly DocumentIntelligenceClient _client;
    private readonly string _modelId;
    private readonly ILogger<AzureDocumentIntelligenceOcrProvider> _logger;

    public AzureDocumentIntelligenceOcrProvider(
        DocumentIntelligenceOptions options,
        ILogger<AzureDocumentIntelligenceOcrProvider> logger)
    {
        _client = new DocumentIntelligenceClient(new Uri(options.Endpoint), new AzureKeyCredential(options.Key));
        _modelId = options.ModelId;
        _logger = logger;
    }

    public async Task<byte[]> MakeSearchableAsync(byte[] imagePdf, CancellationToken cancellationToken)
    {
        var analyzeOptions = new AnalyzeDocumentOptions(_modelId, BinaryData.FromBytes(imagePdf));
        analyzeOptions.Output.Add(AnalyzeOutputOption.Pdf);

        var operation = await _client.AnalyzeDocumentAsync(WaitUntil.Completed, analyzeOptions, cancellationToken);
        var resultId = operation.Id;

        try
        {
            var pdf = await _client.GetAnalyzeResultPdfAsync(_modelId, resultId, cancellationToken);
            return pdf.Value.ToArray();
        }
        finally
        {
            try
            {
                await _client.DeleteAnalyzeResultAsync(_modelId, resultId);
            }
            catch (Exception ex)
            {
                // Not fatal: Azure removes results after its retention period anyway.
                _logger.LogWarning(ex, "Deleting Document Intelligence result {ResultId} failed", resultId);
            }
        }
    }
}

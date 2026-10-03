using Microsoft.Extensions.Logging;

namespace VMCI.Scanner.Pdf;

public sealed record PdfResult(byte[] Content, bool IsSearchable);

/// <summary>
/// Pages in, PDF out. The image PDF is built first; OCR is an improvement on top of it, never a
/// condition: when OCR is not configured or fails, the user gets the image PDF and a warning, and
/// never loses a scan.
/// </summary>
public class SearchablePdfService
{
    private readonly IOcrProvider? _ocr;
    private readonly ILogger<SearchablePdfService> _logger;

    public SearchablePdfService(ILogger<SearchablePdfService> logger, IOcrProvider? ocr = null)
    {
        _ocr = ocr;
        _logger = logger;
    }

    public bool OcrAvailable => _ocr != null;

    public async Task<PdfResult> CreateAsync(IReadOnlyList<byte[]> pages, string title, CancellationToken cancellationToken)
    {
        var imagePdf = ImagePdfBuilder.Build(pages, title);
        if (_ocr == null)
        {
            return new PdfResult(imagePdf, IsSearchable: false);
        }

        try
        {
            var searchable = await _ocr.MakeSearchableAsync(imagePdf, cancellationToken);
            _logger.LogInformation(
                "OCR done: {Pages} pages, image PDF {ImageBytes} bytes, searchable PDF {SearchableBytes} bytes",
                pages.Count, imagePdf.Length, searchable.Length);
            return new PdfResult(searchable, IsSearchable: true);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            throw;
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "OCR failed for a {Pages}-page document; returning the image PDF", pages.Count);
            return new PdfResult(imagePdf, IsSearchable: false);
        }
    }
}

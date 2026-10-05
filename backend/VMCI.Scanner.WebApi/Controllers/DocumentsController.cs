using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Options;
using VMCI.Scanner.DB.UnitOfWork;
using VMCI.Scanner.Mail;
using VMCI.Scanner.Pdf;
using VMCI.Scanner.WebApi.DTOs;
using VMCI.Scanner.WebApi.Extensions;
using VMCI.Scanner.WebApi.Services;

namespace VMCI.Scanner.WebApi.Controllers;

/// <summary>
/// Stateless: a document is processed and forgotten. The client receives the PDF, shows it on the
/// result screen and, for email, uploads it again - no temporary storage and no clean-up on the
/// server. Document contents are never logged.
/// </summary>
[ApiController]
[Route("api/[controller]")]
[Authorize]
public class DocumentsController : ControllerBase
{
    public const string SearchableHeader = "X-Searchable";

    private readonly SearchablePdfService _pdf;
    private readonly IServiceProvider _services;
    private readonly IUnitOfWork _unitOfWork;
    private readonly DocumentLimitsOptions _limits;
    private readonly EmailOptions _email;
    private readonly ILogger<DocumentsController> _logger;

    public DocumentsController(
        SearchablePdfService pdf,
        IServiceProvider services,
        IUnitOfWork unitOfWork,
        IOptions<DocumentLimitsOptions> limits,
        IOptions<EmailOptions> email,
        ILogger<DocumentsController> logger)
    {
        _pdf = pdf;
        _services = services;
        _unitOfWork = unitOfWork;
        _limits = limits.Value;
        _email = email.Value;
        _logger = logger;
    }

    [HttpGet("capabilities")]
    public ActionResult<DocumentCapabilitiesDto> Capabilities()
    {
        return Ok(new DocumentCapabilitiesDto
        {
            SearchablePdf = _pdf.OcrAvailable,
            Email = _services.GetService<IEmailSender>() != null,
            MaxPages = _limits.MaxPages,
        });
    }

    /// <summary>
    /// Pages in (multipart field <c>pages</c>, repeated, in page order), PDF out. The response header
    /// <c>X-Searchable</c> says whether the text layer was added.
    /// </summary>
    [HttpPost("pdf")]
    public async Task<IActionResult> CreatePdf([FromForm] List<IFormFile> pages, [FromForm] string? fileName, CancellationToken cancellationToken)
    {
        if (pages.Count == 0)
        {
            return BadRequest(new { message = "Er zijn geen pagina's ontvangen." });
        }

        if (pages.Count > _limits.MaxPages)
        {
            return BadRequest(new { message = $"Een document kan maximaal {_limits.MaxPages} pagina's bevatten." });
        }

        var images = new List<byte[]>(pages.Count);
        for (var i = 0; i < pages.Count; i++)
        {
            var page = pages[i];
            if (page.Length == 0 || page.Length > _limits.MaxPageBytes)
            {
                return BadRequest(new { message = $"Pagina {i + 1} is te groot of leeg." });
            }

            var data = await ReadAllAsync(page, cancellationToken);
            if (ImagePdfBuilder.DetectFormat(data) == PageImageFormat.Unknown)
            {
                return BadRequest(new { message = $"Pagina {i + 1} is geen JPEG- of PNG-afbeelding." });
            }

            images.Add(data);
        }

        var name = PdfFileName(fileName);
        var result = await _pdf.CreateAsync(images, Path.GetFileNameWithoutExtension(name), cancellationToken);

        _logger.LogInformation(
            "PDF created for account {AccountId}: {Pages} pages, {Bytes} bytes, searchable {Searchable}",
            this.GetCurrentAccountId(), pages.Count, result.Content.Length, result.IsSearchable);

        Response.Headers[SearchableHeader] = result.IsSearchable ? "true" : "false";
        return File(result.Content, "application/pdf", name);
    }

    /// <summary>
    /// Mails a PDF to one of the account's own recipients, from noreply@vmci.be (<see cref="ScanMail"/>).
    /// 503 while the mail service is not configured.
    /// </summary>
    [HttpPost("email")]
    public async Task<IActionResult> Email([FromForm] IFormFile? file, [FromForm] string? recipient, [FromForm] string? fileName, CancellationToken cancellationToken)
    {
        var sender = _services.GetService<IEmailSender>();
        if (sender == null)
        {
            return StatusCode(StatusCodes.Status503ServiceUnavailable,
                new { message = "Mailen is nog niet beschikbaar. Gebruik Delen of Downloaden." });
        }

        var accountId = this.GetCurrentAccountId();
        if (accountId == null)
        {
            return Unauthorized();
        }

        if (file == null || file.Length == 0)
        {
            return BadRequest(new { message = "Er is geen pdf ontvangen." });
        }

        if (file.Length > _email.MaxMessageBytes)
        {
            return BadRequest(new { message = "De pdf is te groot om te mailen. Gebruik Delen of Downloaden." });
        }

        var to = RecipientService.NormalizeEmail(recipient);
        var listed = to == null ? null : await _unitOfWork.Recipient.GetByAccountAndEmailAsync(accountId.Value, to);
        if (listed == null)
        {
            return BadRequest(new { message = "Dit adres staat niet in uw lijst met ontvangers." });
        }

        var data = await ReadAllAsync(file, cancellationToken);
        if (!data.AsSpan().StartsWith("%PDF-"u8))
        {
            return BadRequest(new { message = "Het bestand is geen pdf." });
        }

        var account = await _unitOfWork.Account.GetByIdAsync(accountId.Value);
        if (account == null)
        {
            return Unauthorized();
        }

        var message = ScanMail.Create(listed.Email, $"{account.FirstName} {account.SurName}", account.Email, PdfFileName(fileName), data);

        try
        {
            await sender.SendAsync(message, cancellationToken);
        }
        catch (Exception ex) when (ex is not OperationCanceledException)
        {
            _logger.LogWarning(ex, "Mail from account {AccountId} to {Recipient} ({Bytes} bytes) failed", accountId, listed.Email, data.Length);
            return StatusCode(StatusCodes.Status502BadGateway, new { message = "Mailen is mislukt. Probeer het later opnieuw." });
        }

        _logger.LogInformation("Mail from account {AccountId} to {Recipient} ({Bytes} bytes) sent", accountId, listed.Email, data.Length);
        return NoContent();
    }

    private static async Task<byte[]> ReadAllAsync(IFormFile file, CancellationToken cancellationToken)
    {
        using var stream = new MemoryStream((int)file.Length);
        await file.CopyToAsync(stream, cancellationToken);
        return stream.ToArray();
    }

    /// <summary>The client's chosen name, made safe for a file system, always ending in .pdf.</summary>
    public static string PdfFileName(string? requested)
    {
        var invalid = Path.GetInvalidFileNameChars().Concat(['/', '\\', ':', '*', '?', '"', '<', '>', '|']).ToHashSet();
        var cleaned = new string((requested ?? string.Empty).Where(c => !invalid.Contains(c) && !char.IsControl(c)).ToArray()).Trim(' ', '.');

        if (cleaned.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase))
        {
            cleaned = cleaned[..^4].TrimEnd(' ', '.');
        }

        if (cleaned.Length == 0)
        {
            cleaned = $"Scan {DateTime.Now:yyyy-MM-dd HH.mm}";
        }

        return cleaned + ".pdf";
    }
}

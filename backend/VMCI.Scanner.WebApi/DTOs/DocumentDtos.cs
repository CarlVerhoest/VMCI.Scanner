namespace VMCI.Scanner.WebApi.DTOs;

/// <summary>What this server can do right now; the client shows or hides features from it.</summary>
public class DocumentCapabilitiesDto
{
    /// <summary>OCR is configured; PDFs get a text layer (unless OCR fails for one document).</summary>
    public bool SearchablePdf { get; set; }

    /// <summary>A mail service is configured.</summary>
    public bool Email { get; set; }

    public int MaxPages { get; set; }
}

public class DocumentLimitsOptions
{
    public const string SectionName = "Limits";

    public int MaxPages { get; set; } = 20;

    /// <summary>Per page image; a 2400 px JPEG at quality 0.8 is 300-500 KB.</summary>
    public long MaxPageBytes { get; set; } = 1_572_864;

    /// <summary>The largest request body any endpoint accepts: all pages plus multipart overhead.</summary>
    public long MaxRequestBytes => MaxPages * MaxPageBytes + 1_048_576;
}

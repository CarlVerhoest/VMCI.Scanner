using VMCI.Scanner.Pdf;
using VMCI.Scanner.WebApi.Controllers;
using VMCI.Scanner.WebApi.Services;

namespace VMCI.Scanner.Tests.Unit.Documents;

public class DocumentRulesTests
{
    [Fact]
    public void DetectFormat_RecognisesJpegAndPng_ByMagicBytesOnly()
    {
        Assert.Equal(PageImageFormat.Jpeg, ImagePdfBuilder.DetectFormat([0xFF, 0xD8, 0xFF, 0xE0]));
        Assert.Equal(PageImageFormat.Png, ImagePdfBuilder.DetectFormat([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 0x00]));
        Assert.Equal(PageImageFormat.Unknown, ImagePdfBuilder.DetectFormat("GIF89a"u8));
        Assert.Equal(PageImageFormat.Unknown, ImagePdfBuilder.DetectFormat([]));
    }

    [Fact]
    public void PageSize_PortraitScan_GetsTheLongSideOfA4()
    {
        var (width, height) = ImagePdfBuilder.PageSize(1697, 2400);

        Assert.Equal(ImagePdfBuilder.PageLongSidePoints, height);
        Assert.Equal(595.3, width, 1);
    }

    [Fact]
    public void PageSize_Landscape_PutsTheLongSideHorizontally()
    {
        var (width, height) = ImagePdfBuilder.PageSize(2400, 1200);

        Assert.Equal(ImagePdfBuilder.PageLongSidePoints, width);
        Assert.Equal(ImagePdfBuilder.PageLongSidePoints / 2, height, 3);
    }

    [Theory]
    [InlineData("Factuur oktober", "Factuur oktober.pdf")]
    [InlineData("Factuur oktober.PDF", "Factuur oktober.pdf")]
    [InlineData("../../etc/passwd", "etcpasswd.pdf")]
    [InlineData("a:b*c?d", "abcd.pdf")]
    public void PdfFileName_IsSafeAndEndsInPdf(string requested, string expected)
    {
        Assert.Equal(expected, DocumentsController.PdfFileName(requested));
    }

    [Theory]
    [InlineData(null)]
    [InlineData("")]
    [InlineData("  ...  ")]
    public void PdfFileName_FallsBackToADatedName(string? requested)
    {
        Assert.Matches(@"^Scan \d{4}-\d{2}-\d{2} \d{2}\.\d{2}\.pdf$", DocumentsController.PdfFileName(requested));
    }

    [Theory]
    [InlineData(" boekhouding@example.com ", "boekhouding@example.com")]
    [InlineData("Jan <jan@example.com>", null)]
    [InlineData("a@b.com, c@d.com", null)]
    [InlineData("jan@localhost", null)]
    [InlineData("geen adres", null)]
    public void NormalizeEmail_AcceptsOnePlainAddress(string input, string? expected)
    {
        Assert.Equal(expected, RecipientService.NormalizeEmail(input));
    }
}

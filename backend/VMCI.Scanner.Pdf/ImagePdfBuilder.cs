using PdfSharp.Drawing;
using PdfSharp.Pdf;

namespace VMCI.Scanner.Pdf;

public enum PageImageFormat
{
    Unknown,
    Jpeg,
    Png,
}

/// <summary>
/// Builds an image-only PDF: one page per image, in order. JPEG pages are embedded as they are
/// (no re-encoding), so the PDF is about the size of the photos.
/// </summary>
public static class ImagePdfBuilder
{
    /// <summary>The long side of every page, in points: that of A4 (297 mm).</summary>
    public const double PageLongSidePoints = 841.89;

    /// <summary>Identifies an image by its first bytes; the file name and content type are not trusted.</summary>
    public static PageImageFormat DetectFormat(ReadOnlySpan<byte> data)
    {
        if (data.Length >= 3 && data[0] == 0xFF && data[1] == 0xD8 && data[2] == 0xFF)
        {
            return PageImageFormat.Jpeg;
        }

        ReadOnlySpan<byte> png = [0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A];
        if (data.Length >= png.Length && data[..png.Length].SequenceEqual(png))
        {
            return PageImageFormat.Png;
        }

        return PageImageFormat.Unknown;
    }

    /// <summary>
    /// Page size from the image's aspect ratio: the long side is that of A4, so an A4 scan prints at
    /// A4 and a receipt becomes a narrow page rather than a receipt floating on white.
    /// </summary>
    public static (double Width, double Height) PageSize(int imageWidth, int imageHeight)
    {
        if (imageWidth <= 0 || imageHeight <= 0)
        {
            throw new ArgumentOutOfRangeException(nameof(imageWidth), "Image size must be positive.");
        }

        return imageHeight >= imageWidth
            ? (PageLongSidePoints * imageWidth / imageHeight, PageLongSidePoints)
            : (PageLongSidePoints, PageLongSidePoints * imageHeight / imageWidth);
    }

    public static byte[] Build(IReadOnlyList<byte[]> images, string title)
    {
        if (images.Count == 0)
        {
            throw new ArgumentException("At least one image is needed.", nameof(images));
        }

        using var document = new PdfDocument();
        document.Info.Title = title;
        document.Info.Creator = "VMCI Scanner";

        foreach (var data in images)
        {
            using var stream = new MemoryStream(data, writable: false);
            using var image = XImage.FromStream(stream);

            var (width, height) = PageSize(image.PixelWidth, image.PixelHeight);
            var page = document.AddPage();
            page.Width = XUnit.FromPoint(width);
            page.Height = XUnit.FromPoint(height);

            using var graphics = XGraphics.FromPdfPage(page);
            graphics.DrawImage(image, 0, 0, width, height);
        }

        using var output = new MemoryStream();
        document.Save(output, closeStream: false);
        return output.ToArray();
    }
}

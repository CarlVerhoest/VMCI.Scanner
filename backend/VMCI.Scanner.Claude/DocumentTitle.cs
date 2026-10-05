using System.Globalization;

namespace VMCI.Scanner.Claude;

/// <summary>What Claude read in a document, before it becomes a name. Content is Dutch.</summary>
public sealed record DocumentFacts(bool IsInvoice, string Company, string Nature, string InvoiceDate, string Title);

public static class DocumentTitle
{
    /// <summary>
    /// An invoice becomes <c>company-nature-yyyyMMdd</c>; any other document gets Claude's free title.
    /// An invoice whose date could not be read keeps company and nature. Null when there is nothing
    /// usable, so the user's own name stays.
    /// </summary>
    public static string? Compose(DocumentFacts facts)
    {
        if (facts.IsInvoice)
        {
            var parts = new List<string>();
            AddIfPresent(parts, facts.Company);
            AddIfPresent(parts, facts.Nature);
            if (DateOnly.TryParseExact((facts.InvoiceDate ?? string.Empty).Trim(), "yyyy-MM-dd",
                    CultureInfo.InvariantCulture, DateTimeStyles.None, out var date))
            {
                parts.Add(date.ToString("yyyyMMdd", CultureInfo.InvariantCulture));
            }

            if (parts.Count > 0)
            {
                return string.Join('-', parts);
            }
        }

        var title = Clean(facts.Title);
        return title.Length > 0 ? title : null;
    }

    private static void AddIfPresent(List<string> parts, string? value)
    {
        var cleaned = Clean(value);
        if (cleaned.Length > 0)
        {
            parts.Add(cleaned);
        }
    }

    /// <summary>Line breaks and runs of spaces become one space; nothing is cut off.</summary>
    private static string Clean(string? value) =>
        string.Join(' ', (value ?? string.Empty).Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
}

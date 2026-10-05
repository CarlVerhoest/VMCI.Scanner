using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using VMCI.Scanner.Claude;
using VMCI.Scanner.Pdf;

namespace VMCI.Scanner.DevTools;

/// <summary>
/// suggest-title: runs a page image or a PDF through the same OCR and title suggestion the API uses and
/// prints the proposed name, so the result on real documents can be checked without the app. Prints
/// the name only, never the document's text.
/// </summary>
public static class SuggestTitleCommand
{
    public const string Usage = "suggest-title <jpg|png|pdf> [<file> ...] [--environment <name>]";

    public static async Task<int> RunAsync(string[] args)
    {
        var files = new List<string>();
        string? explicitEnvironment = null;
        for (var i = 0; i < args.Length; i++)
        {
            if (args[i].Equals("--environment", StringComparison.OrdinalIgnoreCase) && i + 1 < args.Length)
            {
                explicitEnvironment = args[++i];
            }
            else if (File.Exists(args[i]))
            {
                files.Add(args[i]);
            }
            else
            {
                Console.Error.WriteLine($"'{args[i]}' is not an existing file.");
                Console.Error.WriteLine("Usage: " + Usage);
                return 2;
            }
        }

        if (files.Count == 0)
        {
            Console.Error.WriteLine("Usage: " + Usage);
            return 2;
        }

        var environment = AppConfiguration.ResolveEnvironment(explicitEnvironment);
        var config = AppConfiguration.Build(environment);
        var ocrOptions = config.GetSection(DocumentIntelligenceOptions.SectionName).Get<DocumentIntelligenceOptions>() ?? new DocumentIntelligenceOptions();
        var claudeOptions = config.GetSection(ClaudeOptions.SectionName).Get<ClaudeOptions>() ?? new ClaudeOptions();
        if (!ocrOptions.IsComplete || !claudeOptions.IsConfigured)
        {
            Console.Error.WriteLine(
                $"Environment '{environment}' needs both DocumentIntelligence:Endpoint/Key and Anthropic:ApiKey (secrets file).");
            return 1;
        }

        using var loggers = LoggerFactory.Create(builder => builder.AddSimpleConsole(o => o.SingleLine = true).SetMinimumLevel(LogLevel.Warning));
        var ocr = new AzureDocumentIntelligenceOcrProvider(ocrOptions, loggers.CreateLogger<AzureDocumentIntelligenceOcrProvider>());
        var suggester = new AnthropicDocumentTitleSuggester(claudeOptions, loggers.CreateLogger<AnthropicDocumentTitleSuggester>());

        Console.WriteLine($"Environment: {environment}, model {claudeOptions.TitleModel}");
        var failures = 0;
        foreach (var file in files)
        {
            try
            {
                var data = await File.ReadAllBytesAsync(file);
                var pdf = data.AsSpan().StartsWith("%PDF-"u8) ? data : ImagePdfBuilder.Build([data], Path.GetFileNameWithoutExtension(file));
                var started = DateTime.UtcNow;
                var read = await ocr.MakeSearchableAsync(pdf, CancellationToken.None);
                var ocrDone = DateTime.UtcNow;
                var name = await suggester.SuggestAsync(read.Text, CancellationToken.None);
                var done = DateTime.UtcNow;

                Console.WriteLine(
                    $"{Path.GetFileName(file)}: {name ?? "(no suggestion)"}  " +
                    $"[OCR {read.Text.Length} chars, {(ocrDone - started).TotalSeconds:F1} s; Claude {(done - ocrDone).TotalSeconds:F1} s]");
            }
            catch (Exception ex)
            {
                failures++;
                Console.Error.WriteLine($"{Path.GetFileName(file)}: failed - {ex.GetType().Name}: {ex.Message}");
            }
        }

        return failures == 0 ? 0 : 1;
    }
}

using Serilog;
using Serilog.Events;

namespace VMCI.Scanner.WebApi.Configuration;

/// <summary>
/// Messages from building the host (secrets loaded, integrations registered or skipped). Written
/// straight to <see cref="Log"/> they would reach only the bootstrap logger, which writes to the
/// console - under IIS nobody sees that, and the log file from appsettings.json does not exist yet.
/// They are held here and written once the configured logger is active (<see cref="Flush"/>).
/// </summary>
public static class StartupLog
{
    private static readonly Lock Gate = new();
    private static readonly List<(LogEventLevel Level, string Template, object?[] Values)> Pending = [];

    public static void Information(string messageTemplate, params object?[] propertyValues) =>
        Add(LogEventLevel.Information, messageTemplate, propertyValues);

    public static void Warning(string messageTemplate, params object?[] propertyValues) =>
        Add(LogEventLevel.Warning, messageTemplate, propertyValues);

    /// <summary>Writes the held messages to the current logger. Called when the pipeline is configured, and before logging a fatal startup error.</summary>
    public static void Flush()
    {
        lock (Gate)
        {
            foreach (var (level, template, values) in Pending)
            {
                Log.Write(level, template, values);
            }
            Pending.Clear();
        }
    }

    private static void Add(LogEventLevel level, string messageTemplate, object?[] propertyValues)
    {
        lock (Gate)
        {
            Pending.Add((level, messageTemplate, propertyValues));
        }
    }
}

using Microsoft.Extensions.Configuration.Json;

namespace VMCI.Scanner.WebApi.Configuration;

/// <summary>
/// Loads <c>backend/secrets/appsettings.secrets.json</c> — keys that must not reach GitHub (GitHub's
/// secret scanning recognises several key formats and can have them revoked or block the push).
/// The folder is gitignored and does NOT travel between machines: every PC and every server needs its own copy.
/// </summary>
public static class SecretsFile
{
    public const string FileName = "appsettings.secrets.json";

    /// <summary>
    /// Adds the secrets file directly after the last appsettings*.json source, so it beats their values
    /// while user secrets, environment variables and the command line still beat it. Returns false when
    /// the file is absent - a machine without it must still start.
    /// </summary>
    public static bool AddSecretsFile(this IConfigurationBuilder builder, string contentRoot)
    {
        ArgumentNullException.ThrowIfNull(builder);

        var directory = System.IO.Path.GetFullPath(System.IO.Path.Combine(contentRoot, "..", "secrets"));
        var path = System.IO.Path.Combine(directory, FileName);

        // Checked here rather than left to optional:true: the file provider for a directory that does not
        // exist throws, and a server without a secrets folder must still start.
        if (!File.Exists(path))
        {
            return false;
        }

        var insertAt = LastAppSettingsIndex(builder) + 1;
        builder.AddJsonFile(path, optional: true, reloadOnChange: false);

        var source = builder.Sources[^1];
        builder.Sources.RemoveAt(builder.Sources.Count - 1);
        builder.Sources.Insert(insertAt, source);
        return true;
    }

    private static int LastAppSettingsIndex(IConfigurationBuilder builder)
    {
        var index = -1;
        for (var i = 0; i < builder.Sources.Count; i++)
        {
            if (builder.Sources[i] is JsonConfigurationSource { Path: { } path } &&
                System.IO.Path.GetFileName(path).StartsWith("appsettings", StringComparison.OrdinalIgnoreCase))
            {
                index = i;
            }
        }

        return index;
    }
}

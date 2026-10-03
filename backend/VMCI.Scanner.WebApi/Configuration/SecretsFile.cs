using Microsoft.Extensions.Configuration.Json;

namespace VMCI.Scanner.WebApi.Configuration;

/// <summary>
/// Loads the files in the secrets folder — keys and credentials that must not reach GitHub. Same pattern as
/// appsettings: <c>appsettings.secrets.json</c> always, then <c>appsettings.secrets.{Environment}.json</c>, so a
/// development machine can hold the Production file without ever reading it.
/// The folder is gitignored and does NOT travel between machines: every PC and every server needs its own copy.
/// </summary>
public static class SecretsFile
{
    public const string FileName = "appsettings.secrets.json";

    public static string EnvironmentFileName(string environmentName) => $"appsettings.secrets.{environmentName}.json";

    /// <summary>
    /// Adds the base secrets file and the one for <paramref name="environmentName"/> directly after the last
    /// appsettings*.json source, so they beat their values while user secrets, environment variables and the command
    /// line still beat them. Returns the full paths of the files found - none is fine, a machine without them must
    /// still start.
    /// </summary>
    public static IReadOnlyList<string> AddSecretsFile(this IConfigurationBuilder builder, string contentRoot,
        string environmentName)
    {
        ArgumentNullException.ThrowIfNull(builder);

        var loaded = new List<string>();
        var directory = FindDirectory(contentRoot);
        if (directory == null)
        {
            return loaded;
        }

        var insertAt = LastAppSettingsIndex(builder) + 1;

        foreach (var fileName in new[] { FileName, EnvironmentFileName(environmentName) })
        {
            var path = System.IO.Path.Combine(directory, fileName);

            // Checked here rather than left to optional:true: the file provider for a directory that does not
            // exist throws, and a server without a secrets folder must still start.
            if (!File.Exists(path))
            {
                continue;
            }

            builder.AddJsonFile(path, optional: true, reloadOnChange: false);

            var source = builder.Sources[^1];
            builder.Sources.RemoveAt(builder.Sources.Count - 1);
            builder.Sources.Insert(insertAt++, source);
            loaded.Add(path);
        }

        return loaded;
    }

    /// <summary>
    /// <c>backend/secrets/</c> next to the project on a development machine; <c>&lt;site root&gt;/secrets</c> on the
    /// Plesk host, whose application pool cannot read above the site folder. The first folder that exists wins, or
    /// null when neither does. web.config hides the second one from HTTP, and the publish profile never touches it.
    /// </summary>
    public static string? FindDirectory(string contentRoot)
    {
        return Candidates(contentRoot).FirstOrDefault(Directory.Exists);
    }

    /// <summary>
    /// Where the secrets folder is, or where it belongs when it does not exist yet: above the content root on a
    /// development machine, inside the site root on a server.
    /// </summary>
    public static string ResolveDirectory(string contentRoot, bool isDevelopment)
    {
        var candidates = Candidates(contentRoot);
        return FindDirectory(contentRoot) ?? (isDevelopment ? candidates[0] : candidates[1]);
    }

    private static string[] Candidates(string contentRoot) =>
    [
        System.IO.Path.GetFullPath(System.IO.Path.Combine(contentRoot, "..", "secrets")),
        System.IO.Path.GetFullPath(System.IO.Path.Combine(contentRoot, "secrets")),
    ];

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

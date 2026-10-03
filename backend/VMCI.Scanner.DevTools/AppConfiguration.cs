using Microsoft.Extensions.Configuration;
using VMCI.Scanner.WebApi.Configuration;

namespace VMCI.Scanner.DevTools;

/// <summary>
/// Builds configuration the way the API does: its appsettings.json, appsettings.{Environment}.json,
/// backend/secrets/appsettings.secrets.json and appsettings.secrets.{Environment}.json, then environment
/// variables. The files are read from the
/// VMCI.Scanner.WebApi project directory, so there is one copy of every setting.
/// </summary>
public static class AppConfiguration
{
    public const string DefaultEnvironment = "Development";

    private const string WebApiProjectName = "VMCI.Scanner.WebApi";

    /// <summary>
    /// The environment to use: the explicit option, else ASPNETCORE_ENVIRONMENT / DOTNET_ENVIRONMENT,
    /// else Development.
    /// </summary>
    public static string ResolveEnvironment(string? explicitEnvironment)
    {
        if (!string.IsNullOrWhiteSpace(explicitEnvironment))
        {
            return explicitEnvironment.Trim();
        }

        var fromVariable = Environment.GetEnvironmentVariable("ASPNETCORE_ENVIRONMENT")
            ?? Environment.GetEnvironmentVariable("DOTNET_ENVIRONMENT");

        return string.IsNullOrWhiteSpace(fromVariable) ? DefaultEnvironment : fromVariable.Trim();
    }

    public static IConfiguration Build(string environment)
    {
        var webApiDirectory = FindWebApiDirectory()
            ?? throw new InvalidOperationException(
                $"Could not find the {WebApiProjectName} project directory. Run this tool from inside the repository.");

        var builder = new ConfigurationBuilder()
            .SetBasePath(webApiDirectory)
            .AddJsonFile("appsettings.json", optional: false, reloadOnChange: false)
            .AddJsonFile($"appsettings.{environment}.json", optional: true, reloadOnChange: false);

        // With --environment Production this also reads appsettings.secrets.Production.json, which holds the
        // server's connection string: that is how create-account reaches the production database.
        builder.AddSecretsFile(webApiDirectory, environment);
        builder.AddEnvironmentVariables();

        return builder.Build();
    }

    // Walks up from the working directory and from the executable's directory until the API project
    // is found next to, or under backend/ of, one of the ancestors.
    private static string? FindWebApiDirectory()
    {
        foreach (var start in new[] { Directory.GetCurrentDirectory(), AppContext.BaseDirectory })
        {
            for (var directory = new DirectoryInfo(start); directory != null; directory = directory.Parent)
            {
                foreach (var candidate in new[]
                {
                    Path.Combine(directory.FullName, WebApiProjectName),
                    Path.Combine(directory.FullName, "backend", WebApiProjectName),
                })
                {
                    if (File.Exists(Path.Combine(candidate, "appsettings.json")))
                    {
                        return candidate;
                    }
                }
            }
        }

        return null;
    }
}

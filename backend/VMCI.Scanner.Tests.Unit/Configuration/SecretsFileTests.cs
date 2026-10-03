using Microsoft.Extensions.Configuration;
using VMCI.Scanner.WebApi.Configuration;

namespace VMCI.Scanner.Tests.Unit.Configuration;

// Each test builds a throw-away folder: <root>/site (the content root) with secrets either above it
// (development layout) or inside it (the Plesk layout, whose application pool cannot read above the site).
public sealed class SecretsFileTests : IDisposable
{
    private readonly string _root = Path.Combine(Path.GetTempPath(), "scanner-secrets-" + Guid.NewGuid().ToString("N"));
    private readonly string _site;

    public SecretsFileTests()
    {
        _site = Path.Combine(_root, "site");
        Directory.CreateDirectory(_site);
    }

    public void Dispose() => Directory.Delete(_root, recursive: true);

    private static void Write(string directory, string fileName, string key, string value)
    {
        Directory.CreateDirectory(directory);
        File.WriteAllText(Path.Combine(directory, fileName), $$"""{ "{{key}}": "{{value}}" }""");
    }

    private IConfiguration Build(string environment, out IReadOnlyList<string> loaded)
    {
        var builder = new ConfigurationBuilder();
        loaded = builder.AddSecretsFile(_site, environment);
        return builder.Build();
    }

    [Fact]
    public void ServerLayout_ReadsSecretsInsideTheSiteRoot_IncludingTheEnvironmentFile()
    {
        var secrets = Path.Combine(_site, "secrets");
        Write(secrets, "appsettings.secrets.Production.json", "Value", "production");

        var configuration = Build("Production", out var loaded);

        Assert.Equal("production", configuration["Value"]);
        Assert.Single(loaded);
    }

    [Fact]
    public void DevelopmentMachine_NeverReadsTheProductionFile()
    {
        var secrets = Path.Combine(_root, "secrets");
        Write(secrets, "appsettings.secrets.json", "Value", "development");
        Write(secrets, "appsettings.secrets.Production.json", "Other", "production");

        var configuration = Build("Development", out _);

        Assert.Equal("development", configuration["Value"]);
        Assert.Null(configuration["Other"]);
    }

    [Fact]
    public void TheFolderAboveTheContentRootWins()
    {
        Write(Path.Combine(_root, "secrets"), "appsettings.secrets.json", "Value", "above");
        Write(Path.Combine(_site, "secrets"), "appsettings.secrets.json", "Value", "inside");

        Assert.Equal("above", Build("Development", out _)["Value"]);
    }

    [Fact]
    public void NoSecretsFolder_StartsWithoutSecrets()
    {
        Build("Production", out var loaded);

        Assert.Empty(loaded);
    }

    [Fact]
    public void ResolveDirectory_WithoutAFolder_PutsItAboveInDevelopment_AndInsideOnAServer()
    {
        Assert.Equal(Path.GetFullPath(Path.Combine(_root, "secrets")), SecretsFile.ResolveDirectory(_site, isDevelopment: true));
        Assert.Equal(Path.GetFullPath(Path.Combine(_site, "secrets")), SecretsFile.ResolveDirectory(_site, isDevelopment: false));
    }
}

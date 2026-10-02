using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.Extensions.Configuration;

namespace VMCI.Scanner.Tests.Integration;

/// <summary>
/// Hosts the real API pipeline in the "Testing" environment: Program.cs registers no database there, so
/// these tests need no SQL Server. The JWT key is a test-only value supplied in memory, which also makes
/// the tests independent of backend/secrets/ existing on the machine.
/// </summary>
public class ScannerWebApplicationFactory : WebApplicationFactory<Program>
{
    public const string TestJwtKey = "integration-test-key-0123456789-abcdefghijklmnopqrstuvwxyz";

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["Jwt:Key"] = TestJwtKey,
            });
        });
    }
}

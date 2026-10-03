using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc.Testing;
using Microsoft.AspNetCore.TestHost;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.DependencyInjection;
using VMCI.Scanner.DB.Data;
using VMCI.Scanner.DB.Models;
using VMCI.Scanner.Shared;
using VMCI.Scanner.WebApi.Services;

namespace VMCI.Scanner.Tests.Integration;

/// <summary>
/// Hosts the real API pipeline in the "Testing" environment. Program.cs registers no database there;
/// this factory supplies an EF Core in-memory one, so the tests need no SQL Server. In-memory ignores
/// the SQL defaults (newid(), sysutcdatetime()), so seeded rows set every value explicitly.
/// </summary>
public class ScannerWebApplicationFactory : WebApplicationFactory<Program>
{
    private readonly string _databaseName = "scanner-tests-" + Guid.NewGuid();
    private readonly PasswordService _passwords = new();

    public static readonly Guid AdminRoleId = Guid.NewGuid();
    public static readonly Guid CoworkerRoleId = Guid.NewGuid();

    protected override void ConfigureWebHost(IWebHostBuilder builder)
    {
        builder.UseEnvironment("Testing");

        builder.ConfigureAppConfiguration((_, configuration) =>
        {
            configuration.AddInMemoryCollection(new Dictionary<string, string?>
            {
                // All tests share one client IP; the rate limit itself is not under test here.
                ["Limits:LoginAttemptsPer15Minutes"] = "1000",
            });
        });

        builder.ConfigureTestServices(services =>
        {
            services.AddDbContext<ScannerContext>(options => options.UseInMemoryDatabase(_databaseName));
        });
    }

    /// <summary>
    /// A client that keeps cookies. HTTPS, because the login cookie is Secure and a cookie container
    /// does not send a Secure cookie over plain HTTP.
    /// </summary>
    public HttpClient CreateCookieClient()
    {
        return CreateClient(new WebApplicationFactoryClientOptions
        {
            AllowAutoRedirect = false,
            BaseAddress = new Uri("https://localhost"),
            HandleCookies = true,
        });
    }

    /// <summary>Adds an account with a unique email and returns that email.</summary>
    public async Task<string> SeedAccountAsync(
        string password,
        bool isAdmin = false,
        bool mustChangePassword = false,
        bool isLocked = false)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ScannerContext>();

        if (!await context.AccountRole.AnyAsync())
        {
            context.AccountRole.Add(new AccountRole { Id = AdminRoleId, Code = AccountRoleCodes.Admin, Name = "Beheerder" });
            context.AccountRole.Add(new AccountRole { Id = CoworkerRoleId, Code = AccountRoleCodes.Coworker, Name = "Medewerker" });
        }

        var email = $"user-{Guid.NewGuid():N}@example.com";
        context.Account.Add(new Account
        {
            Id = Guid.NewGuid(),
            AccountRoleId = isAdmin ? AdminRoleId : CoworkerRoleId,
            Email = email,
            FirstName = "Test",
            SurName = "Gebruiker",
            IsLocked = isLocked,
            PasswordHash = _passwords.HashPassword(password),
            MustChangePassword = mustChangePassword,
            SecurityStamp = Guid.NewGuid(),
        });
        await context.SaveChangesAsync();
        return email;
    }

    public async Task<Account> GetAccountAsync(string email)
    {
        using var scope = Services.CreateScope();
        var context = scope.ServiceProvider.GetRequiredService<ScannerContext>();
        return await context.Account.AsNoTracking().SingleAsync(a => a.Email == email);
    }
}

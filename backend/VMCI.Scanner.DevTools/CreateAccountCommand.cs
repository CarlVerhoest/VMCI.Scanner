using System.ComponentModel.DataAnnotations;
using System.Text;
using Microsoft.Data.SqlClient;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using VMCI.Scanner.DB.Data;
using VMCI.Scanner.DB.Models;
using VMCI.Scanner.DB.UnitOfWork;
using VMCI.Scanner.WebApi.Services;

namespace VMCI.Scanner.DevTools;

/// <summary>
/// create-account: adds a login to the Account table. The password is typed twice at a prompt that does
/// not echo, and only its BCrypt hash is stored - it is never taken from the command line, so it does
/// not end up in shell history.
/// </summary>
public static class CreateAccountCommand
{
    public const string Usage =
        "create-account --email <e> --first-name <f> --surname <s> --role ADMIN|COWORKER " +
        "[--environment <name>] [--confirm-production]";

    private static readonly string[] AllowedRoles = ["ADMIN", "COWORKER"];

    public static async Task<int> RunAsync(string[] args)
    {
        if (!TryParse(args, out var options, out var parseError))
        {
            Console.Error.WriteLine(parseError);
            Console.Error.WriteLine("Usage: " + Usage);
            return 2;
        }

        var environment = AppConfiguration.ResolveEnvironment(options.Environment);
        var isDevelopment = string.Equals(environment, AppConfiguration.DefaultEnvironment, StringComparison.OrdinalIgnoreCase);
        if (!isDevelopment && !options.ConfirmProduction)
        {
            Console.Error.WriteLine(
                $"Refusing to touch the '{environment}' database. Pass --confirm-production to create an account outside Development.");
            return 1;
        }

        var configuration = AppConfiguration.Build(environment);
        var connectionString = configuration.GetConnectionString("DefaultConnection");
        if (string.IsNullOrWhiteSpace(connectionString))
        {
            Console.Error.WriteLine($"ConnectionStrings:DefaultConnection is empty for environment '{environment}'.");
            return 1;
        }

        var target = new SqlConnectionStringBuilder(connectionString);
        Console.WriteLine($"Environment: {environment}");
        Console.WriteLine($"Database:    {target.InitialCatalog} on {target.DataSource}");

        var contextOptions = new DbContextOptionsBuilder<ScannerContext>()
            .UseSqlServer(connectionString)
            .Options;

        using var unitOfWork = new UnitOfWork(new ScannerContext(contextOptions));

        if (await unitOfWork.Account.GetByEmailAsync(options.Email) != null)
        {
            Console.Error.WriteLine($"An account with email '{options.Email}' already exists.");
            return 1;
        }

        var role = await unitOfWork.AccountRole.GetByCodeAsync(options.Role);
        if (role == null)
        {
            Console.Error.WriteLine($"Role '{options.Role}' does not exist in AccountRole. Run the scripts in docs/sql/ first.");
            return 1;
        }

        var passwordService = new PasswordService();
        var password = ReadNewPassword(passwordService);
        if (password == null)
        {
            return 1;
        }

        unitOfWork.Account.Add(new Account
        {
            Id = Guid.NewGuid(),
            AccountRoleId = role.Id,
            Email = options.Email,
            FirstName = options.FirstName,
            SurName = options.Surname,
            IsLocked = false,
            PasswordHash = passwordService.HashPassword(password),
        });
        await unitOfWork.SaveChangesAsync();

        Console.WriteLine($"Account created: {options.Email} ({role.Code}).");
        return 0;
    }

    private static string? ReadNewPassword(IPasswordService passwordService)
    {
        if (Console.IsInputRedirected)
        {
            Console.Error.WriteLine("The password must be typed at the prompt; input cannot be redirected.");
            return null;
        }

        var password = ReadHidden("Password: ");
        if (!passwordService.IsValidPassword(password))
        {
            Console.Error.WriteLine(
                "The password must be at least 8 characters and include an uppercase letter, a lowercase letter and a digit.");
            return null;
        }

        var repeated = ReadHidden("Repeat password: ");
        if (!string.Equals(password, repeated, StringComparison.Ordinal))
        {
            Console.Error.WriteLine("The two passwords are not the same.");
            return null;
        }

        return password;
    }

    // Reads a line key by key without echoing it.
    private static string ReadHidden(string prompt)
    {
        Console.Write(prompt);
        var buffer = new StringBuilder();

        while (true)
        {
            var key = Console.ReadKey(intercept: true);
            if (key.Key == ConsoleKey.Enter)
            {
                break;
            }

            if (key.Key == ConsoleKey.Backspace)
            {
                if (buffer.Length > 0)
                {
                    buffer.Length--;
                }

                continue;
            }

            if (!char.IsControl(key.KeyChar))
            {
                buffer.Append(key.KeyChar);
            }
        }

        Console.WriteLine();
        return buffer.ToString();
    }

    private sealed record Options(
        string Email,
        string FirstName,
        string Surname,
        string Role,
        string? Environment,
        bool ConfirmProduction);

    private static bool TryParse(string[] args, out Options options, out string error)
    {
        options = new Options(string.Empty, string.Empty, string.Empty, string.Empty, null, false);
        error = string.Empty;

        var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        var confirmProduction = false;

        for (var i = 0; i < args.Length; i++)
        {
            switch (args[i].ToLowerInvariant())
            {
                case "--confirm-production":
                    confirmProduction = true;
                    break;

                case "--email":
                case "--first-name":
                case "--surname":
                case "--role":
                case "--environment":
                    if (i + 1 >= args.Length)
                    {
                        error = $"Missing value for {args[i]}.";
                        return false;
                    }

                    values[args[i]] = args[++i].Trim();
                    break;

                default:
                    error = $"Unknown option '{args[i]}'.";
                    return false;
            }
        }

        foreach (var required in new[] { "--email", "--first-name", "--surname", "--role" })
        {
            if (!values.TryGetValue(required, out var value) || value.Length == 0)
            {
                error = $"{required} is required.";
                return false;
            }
        }

        if (!new EmailAddressAttribute().IsValid(values["--email"]))
        {
            error = $"'{values["--email"]}' is not a valid email address.";
            return false;
        }

        var role = values["--role"].ToUpperInvariant();
        if (!AllowedRoles.Contains(role))
        {
            error = $"--role must be one of: {string.Join(", ", AllowedRoles)}.";
            return false;
        }

        options = new Options(
            values["--email"],
            values["--first-name"],
            values["--surname"],
            role,
            values.GetValueOrDefault("--environment"),
            confirmProduction);
        return true;
    }
}

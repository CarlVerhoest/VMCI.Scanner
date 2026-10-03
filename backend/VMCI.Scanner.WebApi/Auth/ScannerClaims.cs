using System.Security.Claims;
using Microsoft.AspNetCore.Authentication.Cookies;
using VMCI.Scanner.DB.Models;
using VMCI.Scanner.Shared;

namespace VMCI.Scanner.WebApi.Auth;

/// <summary>
/// What the login cookie carries. The cookie is encrypted by ASP.NET Data Protection, but it is
/// never trusted on its own: <see cref="AccountSessionValidator"/> checks it against the database on
/// every request and refreshes these claims from the account row.
/// </summary>
public static class ScannerClaims
{
    public const string IsAdmin = "IsAdmin";
    public const string SecurityStamp = "SecurityStamp";
    public const string MustChangePassword = "MustChangePassword";

    public const string AdminPolicy = "Admin";

    public static bool IsAdminAccount(Account account) =>
        string.Equals(account.AccountRole?.Code, AccountRoleCodes.Admin, StringComparison.OrdinalIgnoreCase);

    /// <summary>The principal for an account; the account must be loaded with its role.</summary>
    public static ClaimsPrincipal CreatePrincipal(Account account)
    {
        var claims = new List<Claim>
        {
            new(ClaimTypes.NameIdentifier, account.Id.ToString()),
            new(ClaimTypes.Name, account.Email),
            new(IsAdmin, IsAdminAccount(account).ToString()),
            new(SecurityStamp, account.SecurityStamp.ToString()),
            new(MustChangePassword, account.MustChangePassword.ToString()),
        };

        return new ClaimsPrincipal(
            new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme));
    }

    public static bool MustChangePasswordOf(ClaimsPrincipal principal) =>
        bool.TryParse(principal.FindFirst(MustChangePassword)?.Value, out var value) && value;
}

using System.Security.Claims;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using VMCI.Scanner.DB.UnitOfWork;

namespace VMCI.Scanner.WebApi.Auth;

/// <summary>
/// Runs on every request that carries the login cookie (CookieAuthenticationEvents.OnValidatePrincipal).
///
/// The cookie lives about 400 days, so it must be revocable. It is rejected - and removed - when the
/// account no longer exists, is locked, has no password, or its <c>SecurityStamp</c> differs from the
/// one stamped into the cookie at login. Locking an account or changing its password writes a new
/// stamp, which is how those take effect on every device at its next request.
///
/// A cookie that passes is refreshed from the database (role, forced password change), so an
/// administrator's edit applies without the user signing in again.
/// </summary>
public static class AccountSessionValidator
{
    public static async Task ValidateAsync(CookieValidatePrincipalContext context)
    {
        var principal = context.Principal;
        var idValue = principal?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        var stampValue = principal?.FindFirst(ScannerClaims.SecurityStamp)?.Value;

        if (!Guid.TryParse(idValue, out var accountId) || !Guid.TryParse(stampValue, out var stamp))
        {
            await RejectAsync(context);
            return;
        }

        var unitOfWork = context.HttpContext.RequestServices.GetService<IUnitOfWork>();
        var account = unitOfWork == null ? null : await unitOfWork.Account.GetByIdWithRoleAsync(accountId);

        if (account == null ||
            account.IsLocked ||
            string.IsNullOrEmpty(account.PasswordHash) ||
            account.SecurityStamp != stamp)
        {
            await RejectAsync(context);
            return;
        }

        var fresh = ScannerClaims.CreatePrincipal(account);
        if (!SameClaims(principal!, fresh))
        {
            context.ReplacePrincipal(fresh);
            context.ShouldRenew = true;
        }
    }

    private static async Task RejectAsync(CookieValidatePrincipalContext context)
    {
        context.RejectPrincipal();
        await context.HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
    }

    private static bool SameClaims(ClaimsPrincipal current, ClaimsPrincipal fresh)
    {
        string? Value(ClaimsPrincipal p, string type) => p.FindFirst(type)?.Value;

        return new[] { ClaimTypes.Name, ScannerClaims.IsAdmin, ScannerClaims.MustChangePassword }
            .All(type => Value(current, type) == Value(fresh, type));
    }
}

using Microsoft.AspNetCore.Mvc;

namespace VMCI.Scanner.WebApi.Extensions;

public static class ControllerExtensions
{
    public static Guid? GetCurrentAccountId(this ControllerBase controller)
    {
        // Try multiple possible claim names for the user ID to handle different JWT claim mappings
        var userIdClaim = controller.User?.FindFirst("nameid")?.Value ??
                         controller.User?.FindFirst("sub")?.Value ??
                         controller.User?.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;

        if (string.IsNullOrEmpty(userIdClaim) || !Guid.TryParse(userIdClaim, out var accountId))
        {
            return null;
        }

        return accountId;
    }

    public static string GetCurrentUsername(this ControllerBase controller)
    {
        // Try multiple possible claim names for the username
        var username = controller.User?.FindFirst("unique_name")?.Value ??
                      controller.User?.FindFirst(System.Security.Claims.ClaimTypes.Name)?.Value;

        if (string.IsNullOrEmpty(username))
        {
            throw new UnauthorizedAccessException("Invalid or missing username");
        }

        return username;
    }

    // "IsAdmin" is added by AuthController.Login via TokenService.GenerateToken's additionalClaims.
    public static bool IsCurrentUserAdmin(this ControllerBase controller)
    {
        var isAdminClaim = controller.User?.FindFirst("IsAdmin")?.Value;
        return bool.TryParse(isAdminClaim, out var isAdmin) && isAdmin;
    }
}

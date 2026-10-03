using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.Filters;

namespace VMCI.Scanner.WebApi.Auth;

/// <summary>
/// Marks an action a signed-in user may call while they still have to replace the temporary
/// password an administrator gave them: login, logout, who-am-I and the password change itself.
/// </summary>
[AttributeUsage(AttributeTargets.Method | AttributeTargets.Class)]
public sealed class AllowWhilePasswordChangeRequiredAttribute : Attribute;

/// <summary>
/// Global MVC filter: while <c>Account.MustChangePassword</c> is set, every other action answers 403
/// with <see cref="ErrorCode"/>, so the client knows to show the password form.
/// </summary>
public sealed class PasswordChangeRequiredFilter : IAuthorizationFilter
{
    public const string ErrorCode = "PASSWORD_CHANGE_REQUIRED";

    public void OnAuthorization(AuthorizationFilterContext context)
    {
        var user = context.HttpContext.User;
        if (user.Identity?.IsAuthenticated != true || !ScannerClaims.MustChangePasswordOf(user))
        {
            return;
        }

        if (context.ActionDescriptor.EndpointMetadata.OfType<AllowWhilePasswordChangeRequiredAttribute>().Any())
        {
            return;
        }

        context.Result = new ObjectResult(new
        {
            code = ErrorCode,
            message = "Kies eerst een eigen wachtwoord.",
        })
        {
            StatusCode = StatusCodes.Status403Forbidden,
        };
    }
}

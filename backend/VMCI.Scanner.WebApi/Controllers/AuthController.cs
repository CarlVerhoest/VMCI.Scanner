using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;
using VMCI.Scanner.DB.Models;
using VMCI.Scanner.DB.UnitOfWork;
using VMCI.Scanner.WebApi.Auth;
using VMCI.Scanner.WebApi.DTOs;
using VMCI.Scanner.WebApi.Extensions;
using VMCI.Scanner.WebApi.Services;

namespace VMCI.Scanner.WebApi.Controllers;

/// <summary>
/// Cookie login. A device stays signed in until the user logs off, an administrator locks the
/// account or resets its password, or the cookie goes ~400 days unused (docs/security.md).
/// </summary>
[ApiController]
[Route("api/[controller]")]
[AllowWhilePasswordChangeRequired]
public class AuthController : ControllerBase
{
    public const string LoginRateLimitPolicy = "login";

    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordService _passwordService;

    public AuthController(IUnitOfWork unitOfWork, IPasswordService passwordService)
    {
        _unitOfWork = unitOfWork;
        _passwordService = passwordService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    [EnableRateLimiting(LoginRateLimitPolicy)]
    public async Task<ActionResult<SessionDto>> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var account = await _unitOfWork.Account.GetByEmailAsync(request.Email.Trim());

        // Generic 401 for any failure reason (unknown email, locked account, no password
        // set yet, or wrong password) so the response doesn't leak whether an email is
        // registered - a standard defense against user-enumeration attacks.
        if (account == null ||
            account.IsLocked ||
            string.IsNullOrEmpty(account.PasswordHash) ||
            !_passwordService.VerifyPassword(request.Password, account.PasswordHash))
        {
            return Unauthorized(new { message = "Ongeldig e-mailadres of wachtwoord." });
        }

        await SignInAsync(HttpContext, account);
        return Ok(ToSessionDto(account));
    }

    [HttpPost("logout")]
    [AllowAnonymous]
    public async Task<IActionResult> Logout()
    {
        await HttpContext.SignOutAsync(CookieAuthenticationDefaults.AuthenticationScheme);
        return NoContent();
    }

    [HttpGet("me")]
    [Authorize]
    public async Task<ActionResult<SessionDto>> Me()
    {
        var accountId = this.GetCurrentAccountId();
        var account = accountId == null ? null : await _unitOfWork.Account.GetByIdWithRoleAsync(accountId.Value);
        if (account == null)
        {
            return Unauthorized();
        }

        return Ok(ToSessionDto(account));
    }

    /// <summary>Issues (or re-issues) the persistent login cookie for an account loaded with its role.</summary>
    public static Task SignInAsync(HttpContext httpContext, Account account)
    {
        return httpContext.SignInAsync(
            CookieAuthenticationDefaults.AuthenticationScheme,
            ScannerClaims.CreatePrincipal(account),
            new AuthenticationProperties { IsPersistent = true });
    }

    public static SessionDto ToSessionDto(Account account)
    {
        return new SessionDto
        {
            AccountId = account.Id,
            Email = account.Email,
            FirstName = account.FirstName,
            SurName = account.SurName,
            IsAdmin = ScannerClaims.IsAdminAccount(account),
            MustChangePassword = account.MustChangePassword,
        };
    }
}

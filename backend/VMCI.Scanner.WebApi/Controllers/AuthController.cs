using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VMCI.Scanner.DB.UnitOfWork;
using VMCI.Scanner.WebApi.DTOs;
using VMCI.Scanner.WebApi.Services;

namespace VMCI.Scanner.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class AuthController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordService _passwordService;
    private readonly ITokenService _tokenService;

    public AuthController(
        IUnitOfWork unitOfWork,
        IPasswordService passwordService,
        ITokenService tokenService)
    {
        _unitOfWork = unitOfWork;
        _passwordService = passwordService;
        _tokenService = tokenService;
    }

    [HttpPost("login")]
    [AllowAnonymous]
    public async Task<ActionResult<LoginResponse>> Login([FromBody] LoginRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var account = await _unitOfWork.Account.GetByEmailAsync(request.Email);

        // Generic 401 for any failure reason (unknown email, locked account, no password
        // set yet, or wrong password) so the response doesn't leak whether an email is
        // registered - a standard defense against user-enumeration attacks.
        if (account == null ||
            account.IsLocked ||
            string.IsNullOrEmpty(account.PasswordHash) ||
            !_passwordService.VerifyPassword(request.Password, account.PasswordHash))
        {
            return Unauthorized(new { message = "Invalid email or password." });
        }

        // Admin-ness is AccountRole.Code == "ADMIN" (seeded rows: ADMIN/Beheerder, COWORKER/Medewerker).
        var isAdmin = string.Equals(account.AccountRole?.Code, "ADMIN", StringComparison.OrdinalIgnoreCase);

        var token = _tokenService.GenerateToken(
            account.Id,
            account.Email,
            new[] { new Claim("IsAdmin", isAdmin.ToString()) });

        var response = new LoginResponse
        {
            Token = token,
            AccountId = account.Id,
            Email = account.Email,
            FirstName = account.FirstName,
            SurName = account.SurName,
            IsAdmin = isAdmin,
        };

        return Ok(response);
    }
}

using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VMCI.Scanner.DB.UnitOfWork;
using VMCI.Scanner.WebApi.DTOs;
using VMCI.Scanner.WebApi.Extensions;
using VMCI.Scanner.WebApi.Services;

namespace VMCI.Scanner.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
[Authorize]
public class AccountController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordService _passwordService;

    public AccountController(IUnitOfWork unitOfWork, IPasswordService passwordService)
    {
        _unitOfWork = unitOfWork;
        _passwordService = passwordService;
    }

    [HttpGet("me")]
    public async Task<ActionResult<AccountProfileDto>> GetMe()
    {
        var accountId = this.GetCurrentAccountId();
        if (accountId == null)
        {
            // Shouldn't happen under [Authorize] with a valid token, but be defensive.
            return Unauthorized();
        }

        var account = await _unitOfWork.Account.GetByIdWithRoleAsync(accountId.Value);
        if (account == null)
        {
            return NotFound();
        }

        return Ok(ToProfileDto(account));
    }

    [HttpPut("me")]
    public async Task<ActionResult<AccountProfileDto>> UpdateMe([FromBody] UpdateProfileRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var accountId = this.GetCurrentAccountId();
        if (accountId == null)
        {
            return Unauthorized();
        }

        var account = await _unitOfWork.Account.GetByIdWithRoleAsync(accountId.Value);
        if (account == null)
        {
            return NotFound();
        }

        // UpdateProfileRequest has no role field, so this can never change AccountRoleId.
        account.FirstName = request.FirstName;
        account.SurName = request.SurName;

        _unitOfWork.Account.Update(account);
        await _unitOfWork.SaveChangesAsync();

        return Ok(ToProfileDto(account));
    }

    [HttpPost("me/change-password")]
    public async Task<IActionResult> ChangePassword([FromBody] ChangePasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var accountId = this.GetCurrentAccountId();
        if (accountId == null)
        {
            return Unauthorized();
        }

        var account = await _unitOfWork.Account.GetByIdAsync(accountId.Value);
        if (account == null)
        {
            return NotFound();
        }

        // Generic failure message - don't leak whether the account has a password set yet.
        if (string.IsNullOrEmpty(account.PasswordHash) ||
            !_passwordService.VerifyPassword(request.CurrentPassword, account.PasswordHash))
        {
            return BadRequest(new { message = "Het huidige wachtwoord is onjuist." });
        }

        if (!_passwordService.IsValidPassword(request.NewPassword))
        {
            return BadRequest(new
            {
                message = "Het nieuwe wachtwoord moet minstens 8 tekens lang zijn en een hoofdletter, een kleine letter en een cijfer bevatten."
            });
        }

        account.PasswordHash = _passwordService.HashPassword(request.NewPassword);

        _unitOfWork.Account.Update(account);
        await _unitOfWork.SaveChangesAsync();

        return Ok();
    }

    private static AccountProfileDto ToProfileDto(VMCI.Scanner.DB.Models.Account account)
    {
        return new AccountProfileDto
        {
            FirstName = account.FirstName,
            SurName = account.SurName,
            Email = account.Email,
            RoleCode = account.AccountRole?.Code ?? string.Empty,
            RoleName = account.AccountRole?.Name ?? string.Empty,
        };
    }
}

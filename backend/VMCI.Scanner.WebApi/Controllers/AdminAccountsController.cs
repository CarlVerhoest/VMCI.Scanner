using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using VMCI.Scanner.DB.Models;
using VMCI.Scanner.DB.UnitOfWork;
using VMCI.Scanner.WebApi.Auth;
using VMCI.Scanner.WebApi.DTOs;
using VMCI.Scanner.WebApi.Extensions;
using VMCI.Scanner.WebApi.Services;
using VMCI.Scanner.Shared;

namespace VMCI.Scanner.WebApi.Controllers;

/// <summary>
/// Account management for administrators. Invitations happen outside the system: the administrator
/// creates the account with a temporary password and hands it over in person; the user must replace
/// it at first login. There is no self-service password reset - an administrator sets a new
/// temporary password instead.
///
/// An administrator cannot lock their own account or take away their own administrator role, so the
/// application can never end up without one by accident.
/// </summary>
[ApiController]
[Route("api/admin/accounts")]
[Authorize(Policy = ScannerClaims.AdminPolicy)]
public class AdminAccountsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;
    private readonly IPasswordService _passwordService;
    private readonly IRecipientService _recipients;
    private readonly ILogger<AdminAccountsController> _logger;

    public AdminAccountsController(
        IUnitOfWork unitOfWork,
        IPasswordService passwordService,
        IRecipientService recipients,
        ILogger<AdminAccountsController> logger)
    {
        _unitOfWork = unitOfWork;
        _passwordService = passwordService;
        _recipients = recipients;
        _logger = logger;
    }

    [HttpGet]
    public async Task<ActionResult<List<AdminAccountDto>>> GetAll()
    {
        var accounts = await _unitOfWork.Account.GetAllWithRoleAsync();
        return Ok(accounts.Select(ToDto).ToList());
    }

    [HttpGet("{id:guid}")]
    public async Task<ActionResult<AdminAccountDto>> Get(Guid id)
    {
        var account = await _unitOfWork.Account.GetByIdWithRoleAsync(id);
        return account == null ? NotFound() : Ok(ToDto(account));
    }

    [HttpGet("/api/admin/roles")]
    public async Task<ActionResult<List<RoleDto>>> GetRoles()
    {
        var roles = await _unitOfWork.AccountRole.GetAllAsync();
        return Ok(roles
            .OrderBy(r => r.Name)
            .Select(r => new RoleDto { Code = r.Code, Name = r.Name })
            .ToList());
    }

    [HttpPost]
    public async Task<ActionResult<AdminAccountDto>> Create([FromBody] CreateAccountRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var email = request.Email.Trim();
        if (await _unitOfWork.Account.EmailExistsAsync(email))
        {
            return Conflict(new { message = "Er bestaat al een account met dit e-mailadres." });
        }

        var role = await _unitOfWork.AccountRole.GetByCodeAsync(request.RoleCode);
        if (role == null)
        {
            return BadRequest(new { message = "Onbekende rol." });
        }

        var account = new Account
        {
            Id = Guid.NewGuid(),
            AccountRoleId = role.Id,
            Email = email,
            FirstName = request.FirstName.Trim(),
            SurName = request.SurName.Trim(),
            IsLocked = false,
            PasswordHash = _passwordService.HashPassword(request.TemporaryPassword),
            MustChangePassword = true,
            SecurityStamp = Guid.NewGuid(),
        };
        _unitOfWork.Account.Add(account);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Account {AccountId} ({Email}) created by {AdminId}", account.Id, email, this.GetCurrentAccountId());

        account.AccountRole = role;
        return CreatedAtAction(nameof(Get), new { id = account.Id }, ToDto(account));
    }

    [HttpPut("{id:guid}")]
    public async Task<ActionResult<AdminAccountDto>> Update(Guid id, [FromBody] UpdateAccountRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var account = await _unitOfWork.Account.GetByIdWithRoleAsync(id);
        if (account == null)
        {
            return NotFound();
        }

        var email = request.Email.Trim();
        if (await _unitOfWork.Account.EmailExistsAsync(email, exceptId: id))
        {
            return Conflict(new { message = "Er bestaat al een account met dit e-mailadres." });
        }

        var role = await _unitOfWork.AccountRole.GetByCodeAsync(request.RoleCode);
        if (role == null)
        {
            return BadRequest(new { message = "Onbekende rol." });
        }

        if (IsSelf(id) && !string.Equals(role.Code, AccountRoleCodes.Admin, StringComparison.OrdinalIgnoreCase))
        {
            return BadRequest(new { message = "U kunt uw eigen beheerdersrol niet afnemen." });
        }

        account.Email = email;
        account.FirstName = request.FirstName.Trim();
        account.SurName = request.SurName.Trim();
        account.AccountRoleId = role.Id;

        _unitOfWork.Account.Update(account);
        await _unitOfWork.SaveChangesAsync();

        account.AccountRole = role;
        return Ok(ToDto(account));
    }

    /// <summary>Sets a new temporary password; the account is signed out everywhere.</summary>
    [HttpPost("{id:guid}/reset-password")]
    public async Task<ActionResult<AdminAccountDto>> ResetPassword(Guid id, [FromBody] ResetPasswordRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        var account = await _unitOfWork.Account.GetByIdWithRoleAsync(id);
        if (account == null)
        {
            return NotFound();
        }

        account.PasswordHash = _passwordService.HashPassword(request.TemporaryPassword);
        account.MustChangePassword = true;
        account.SecurityStamp = Guid.NewGuid();

        _unitOfWork.Account.Update(account);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Password of account {AccountId} reset by {AdminId}", id, this.GetCurrentAccountId());

        if (IsSelf(id))
        {
            // Keep the administrator's own device signed in; it now has to choose a password too.
            await AuthController.SignInAsync(HttpContext, account);
        }

        return Ok(ToDto(account));
    }

    /// <summary>Locks the account; every signed-in device is rejected on its next request.</summary>
    [HttpPost("{id:guid}/lock")]
    public Task<ActionResult<AdminAccountDto>> Lock(Guid id) => SetLocked(id, true);

    [HttpPost("{id:guid}/unlock")]
    public Task<ActionResult<AdminAccountDto>> Unlock(Guid id) => SetLocked(id, false);

    private async Task<ActionResult<AdminAccountDto>> SetLocked(Guid id, bool locked)
    {
        if (locked && IsSelf(id))
        {
            return BadRequest(new { message = "U kunt uw eigen account niet blokkeren." });
        }

        var account = await _unitOfWork.Account.GetByIdWithRoleAsync(id);
        if (account == null)
        {
            return NotFound();
        }

        account.IsLocked = locked;
        if (locked)
        {
            account.SecurityStamp = Guid.NewGuid();
        }

        _unitOfWork.Account.Update(account);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Account {AccountId} {Action} by {AdminId}", id, locked ? "locked" : "unlocked", this.GetCurrentAccountId());
        return Ok(ToDto(account));
    }

    [HttpGet("{id:guid}/recipients")]
    public async Task<ActionResult<List<RecipientDto>>> GetRecipients(Guid id)
    {
        if (await _unitOfWork.Account.GetByIdAsync(id) == null)
        {
            return NotFound();
        }

        return Ok(await _recipients.GetAsync(id));
    }

    [HttpPost("{id:guid}/recipients")]
    public async Task<ActionResult<RecipientDto>> AddRecipient(Guid id, [FromBody] AddRecipientRequest request)
    {
        if (!ModelState.IsValid)
        {
            return ValidationProblem(ModelState);
        }

        if (await _unitOfWork.Account.GetByIdAsync(id) == null)
        {
            return NotFound();
        }

        var (recipient, error) = await _recipients.AddAsync(id, request);
        return recipient == null ? BadRequest(new { message = error }) : Ok(recipient);
    }

    [HttpDelete("{id:guid}/recipients/{recipientId:guid}")]
    public async Task<IActionResult> RemoveRecipient(Guid id, Guid recipientId)
    {
        var recipient = await _unitOfWork.Recipient.GetByIdAsync(recipientId);
        if (recipient == null || recipient.AccountId != id)
        {
            return NotFound();
        }

        _unitOfWork.Recipient.Remove(recipient);
        await _unitOfWork.SaveChangesAsync();

        _logger.LogInformation("Recipient {Email} removed from account {AccountId} by {AdminId}", recipient.Email, id, this.GetCurrentAccountId());
        return NoContent();
    }

    private bool IsSelf(Guid id) => this.GetCurrentAccountId() == id;

    private static AdminAccountDto ToDto(Account account) => new()
    {
        Id = account.Id,
        Email = account.Email,
        FirstName = account.FirstName,
        SurName = account.SurName,
        RoleCode = account.AccountRole?.Code ?? string.Empty,
        RoleName = account.AccountRole?.Name ?? string.Empty,
        IsLocked = account.IsLocked,
        MustChangePassword = account.MustChangePassword,
    };
}

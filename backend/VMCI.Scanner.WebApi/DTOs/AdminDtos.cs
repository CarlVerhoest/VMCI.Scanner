using System.ComponentModel.DataAnnotations;

namespace VMCI.Scanner.WebApi.DTOs;

public class AdminAccountDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string SurName { get; set; } = string.Empty;
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
    public bool IsLocked { get; set; }
    public bool MustChangePassword { get; set; }
}

public class RoleDto
{
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}

public abstract class AccountRequestBase
{
    [Required]
    [EmailAddress]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    [MaxLength(100)]
    public string SurName { get; set; } = string.Empty;

    [Required]
    public string RoleCode { get; set; } = string.Empty;
}

public class CreateAccountRequest : AccountRequestBase
{
    /// <summary>
    /// Handed over in person; the user must replace it at first login. Deliberately not held to the
    /// password rules (decided 03/10/2026), only to <see cref="AdminPasswordRules.MinTemporaryLength"/>.
    /// </summary>
    [Required]
    [MinLength(AdminPasswordRules.MinTemporaryLength)]
    public string TemporaryPassword { get; set; } = string.Empty;
}

public class UpdateAccountRequest : AccountRequestBase;

public class ResetPasswordRequest
{
    [Required]
    [MinLength(AdminPasswordRules.MinTemporaryLength)]
    public string TemporaryPassword { get; set; } = string.Empty;
}

public static class AdminPasswordRules
{
    public const int MinTemporaryLength = 4;
}

public class RecipientDto
{
    public Guid Id { get; set; }
    public string Email { get; set; } = string.Empty;
    public string? Label { get; set; }
}

public class AddRecipientRequest
{
    [Required]
    [MaxLength(256)]
    public string Email { get; set; } = string.Empty;

    [MaxLength(100)]
    public string? Label { get; set; }
}

using System.ComponentModel.DataAnnotations;

namespace VMCI.Scanner.WebApi.DTOs;

// Response shape for the current account's profile. RoleCode/RoleName are display-only -
// there is no request DTO field that can carry a role, so there is no code path that could
// accidentally let a caller change their own role via this controller.
public class AccountProfileDto
{
    public string FirstName { get; set; } = string.Empty;
    public string SurName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string RoleCode { get; set; } = string.Empty;
    public string RoleName { get; set; } = string.Empty;
}

// Deliberately has no role field - structurally cannot carry a role change.
public class UpdateProfileRequest
{
    [Required]
    public string FirstName { get; set; } = string.Empty;

    [Required]
    public string SurName { get; set; } = string.Empty;
}

public class ChangePasswordRequest
{
    [Required]
    public string CurrentPassword { get; set; } = string.Empty;

    [Required]
    public string NewPassword { get; set; } = string.Empty;
}

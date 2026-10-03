using System.ComponentModel.DataAnnotations;

namespace VMCI.Scanner.WebApi.DTOs;

public class LoginRequest
{
    [Required]
    [EmailAddress]
    public string Email { get; set; } = string.Empty;

    [Required]
    public string Password { get; set; } = string.Empty;
}

/// <summary>The signed-in account, as the client needs it at startup and after login.</summary>
public class SessionDto
{
    public Guid AccountId { get; set; }
    public string Email { get; set; } = string.Empty;
    public string FirstName { get; set; } = string.Empty;
    public string SurName { get; set; } = string.Empty;
    public bool IsAdmin { get; set; }

    /// <summary>The account still has the temporary password an administrator set.</summary>
    public bool MustChangePassword { get; set; }
}

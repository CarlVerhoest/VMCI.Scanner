using System;
using System.Collections.Generic;

namespace VMCI.Scanner.DB.Models;

public partial class Account
{
    public Guid Id { get; set; }

    public Guid AccountRoleId { get; set; }

    public string Email { get; set; } = null!;

    public string FirstName { get; set; } = null!;

    public string SurName { get; set; } = null!;

    public bool IsLocked { get; set; }

    public string? PasswordHash { get; set; }

    public bool MustChangePassword { get; set; }

    public Guid SecurityStamp { get; set; }

    public virtual AccountRole AccountRole { get; set; } = null!;

    public virtual ICollection<Recipient> Recipient { get; set; } = new List<Recipient>();
}

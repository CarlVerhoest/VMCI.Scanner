using System;
using System.Collections.Generic;

namespace VMCI.Scanner.DB.Models;

public partial class Recipient
{
    public Guid Id { get; set; }

    public Guid AccountId { get; set; }

    public string Email { get; set; } = null!;

    public string? Label { get; set; }

    public DateTime CreatedAt { get; set; }

    public virtual Account Account { get; set; } = null!;
}

using System;
using System.Collections.Generic;

namespace VMCI.Scanner.DB.Models;

public partial class AccountRole
{
    public Guid Id { get; set; }

    public string Code { get; set; } = null!;

    public string Name { get; set; } = null!;

    public virtual ICollection<Account> Account { get; set; } = new List<Account>();
}

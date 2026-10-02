using Microsoft.EntityFrameworkCore;
using VMCI.Scanner.DB.Data;
using VMCI.Scanner.DB.Models;

namespace VMCI.Scanner.DB.Repositories;

public interface IAccountRoleRepository : IRepository<AccountRole>
{
    Task<AccountRole?> GetByCodeAsync(string code);
}

public class AccountRoleRepository : Repository<AccountRole>, IAccountRoleRepository
{
    public AccountRoleRepository(ScannerContext context) : base(context)
    {
    }

    public async Task<AccountRole?> GetByCodeAsync(string code)
    {
        return await _dbSet
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Code == code);
    }
}

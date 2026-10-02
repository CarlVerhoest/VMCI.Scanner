using Microsoft.EntityFrameworkCore;
using VMCI.Scanner.DB.Data;
using VMCI.Scanner.DB.Models;

namespace VMCI.Scanner.DB.Repositories;

public interface IAccountRepository : IRepository<Account>
{
    Task<Account?> GetByEmailAsync(string email);
    Task<Account?> GetByIdWithRoleAsync(Guid id);
}

public class AccountRepository : Repository<Account>, IAccountRepository
{
    public AccountRepository(ScannerContext context) : base(context)
    {
    }

    public async Task<Account?> GetByEmailAsync(string email)
    {
        return await _dbSet
            .AsNoTracking()
            .Include(a => a.AccountRole)
            .FirstOrDefaultAsync(a => a.Email == email);
    }

    public async Task<Account?> GetByIdWithRoleAsync(Guid id)
    {
        return await _dbSet
            .AsNoTracking()
            .Include(a => a.AccountRole)
            .FirstOrDefaultAsync(a => a.Id == id);
    }
}

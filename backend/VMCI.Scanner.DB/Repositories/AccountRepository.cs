using Microsoft.EntityFrameworkCore;
using VMCI.Scanner.DB.Data;
using VMCI.Scanner.DB.Models;

namespace VMCI.Scanner.DB.Repositories;

public interface IAccountRepository : IRepository<Account>
{
    Task<Account?> GetByEmailAsync(string email);
    Task<Account?> GetByIdWithRoleAsync(Guid id);
    Task<List<Account>> GetAllWithRoleAsync();
    Task<bool> EmailExistsAsync(string email, Guid? exceptId = null);
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

    public async Task<List<Account>> GetAllWithRoleAsync()
    {
        return await _dbSet
            .AsNoTracking()
            .Include(a => a.AccountRole)
            .OrderBy(a => a.SurName).ThenBy(a => a.FirstName)
            .ToListAsync();
    }

    public async Task<bool> EmailExistsAsync(string email, Guid? exceptId = null)
    {
        return await _dbSet.AnyAsync(a => a.Email == email && (exceptId == null || a.Id != exceptId));
    }
}

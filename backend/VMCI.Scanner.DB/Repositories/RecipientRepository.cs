using Microsoft.EntityFrameworkCore;
using VMCI.Scanner.DB.Data;
using VMCI.Scanner.DB.Models;

namespace VMCI.Scanner.DB.Repositories;

public interface IRecipientRepository : IRepository<Recipient>
{
    Task<List<Recipient>> GetByAccountAsync(Guid accountId);
    Task<Recipient?> GetByAccountAndEmailAsync(Guid accountId, string email);
}

public class RecipientRepository : Repository<Recipient>, IRecipientRepository
{
    public RecipientRepository(ScannerContext context) : base(context)
    {
    }

    public async Task<List<Recipient>> GetByAccountAsync(Guid accountId)
    {
        return await _dbSet
            .AsNoTracking()
            .Where(r => r.AccountId == accountId)
            .OrderBy(r => r.Label ?? r.Email)
            .ToListAsync();
    }

    // The column collation is case-insensitive, so this matches regardless of case.
    public async Task<Recipient?> GetByAccountAndEmailAsync(Guid accountId, string email)
    {
        return await _dbSet
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.AccountId == accountId && r.Email == email);
    }
}

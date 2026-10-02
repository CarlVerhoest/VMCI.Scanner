using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using VMCI.Scanner.DB.Data;
using VMCI.Scanner.DB.Repositories;

namespace VMCI.Scanner.DB.UnitOfWork;

/// <summary>
/// Unit of Work pattern implementation for managing repository instances and transactions.
/// Provides a single point of coordination for database operations across multiple repositories.
/// </summary>
public class UnitOfWork : IUnitOfWork
{
    private readonly ScannerContext _context;
    private IDbContextTransaction? _transaction;

    public UnitOfWork(ScannerContext context)
    {
        _context = context;

        Account = new AccountRepository(_context);
        AccountRole = new AccountRoleRepository(_context);
        // Initialize additional entity-specific repositories here as they're built out.
    }

    /// <inheritdoc/>
    public IAccountRepository Account { get; }

    /// <inheritdoc/>
    public IAccountRoleRepository AccountRole { get; }

    /// <inheritdoc/>
    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    /// <inheritdoc/>
    public async Task BeginTransactionAsync()
    {
        _transaction = await _context.Database.BeginTransactionAsync();
    }

    /// <inheritdoc/>
    public async Task CommitAsync()
    {
        if (_transaction == null)
        {
            throw new InvalidOperationException(
                "No active transaction. Call BeginTransactionAsync first.");
        }

        try
        {
            await _context.SaveChangesAsync();
            await _transaction.CommitAsync();
        }
        catch
        {
            await RollbackAsync();
            throw;
        }
        finally
        {
            _transaction.Dispose();
            _transaction = null;
        }
    }

    /// <inheritdoc/>
    public async Task RollbackAsync()
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync();
            _transaction.Dispose();
            _transaction = null;
        }
    }

    /// <inheritdoc/>
    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}

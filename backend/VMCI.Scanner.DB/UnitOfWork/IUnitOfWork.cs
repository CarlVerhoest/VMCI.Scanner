using VMCI.Scanner.DB.Repositories;

namespace VMCI.Scanner.DB.UnitOfWork;

/// <summary>
/// Unit of Work pattern interface for managing repository instances and transactions.
/// Implements IDisposable for proper resource cleanup.
///
/// Add one property per entity repository here as it is actually needed (property name matches
/// the DbSet name exactly — no pluralization, see ../CLAUDE.md) and initialize it in UnitOfWork.cs.
/// </summary>
public interface IUnitOfWork : IDisposable
{
    IAccountRepository Account { get; }
    IAccountRoleRepository AccountRole { get; }
    // Add one property per entity repository here as it's built out

    /// <summary>
    /// Saves all changes made in the current unit of work to the database.
    /// </summary>
    /// <returns>Number of entities affected</returns>
    Task<int> SaveChangesAsync();

    /// <summary>
    /// Begins a new database transaction.
    /// </summary>
    Task BeginTransactionAsync();

    /// <summary>
    /// Commits the current transaction to the database.
    /// </summary>
    Task CommitAsync();

    /// <summary>
    /// Rolls back the current transaction.
    /// </summary>
    Task RollbackAsync();
}

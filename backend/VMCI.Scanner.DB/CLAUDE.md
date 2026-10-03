# Repository Pattern & Unit of Work - Implementation Guide

This document describes the exact data access pattern used in the VMCI.Scanner.DB project. **Follow this pattern for all future entities** to maintain consistency and code quality.

## Current state

Keep this section current. As of 03/10/2026: `Account`, `AccountRole` and `Recipient` are scaffolded from `cverhoest_scanner` into `Models/`, with `Data/ScannerContext.cs` (EF Core 10.0.12); `AccountRepository`, `AccountRoleRepository` and `RecipientRepository` exist and are on `IUnitOfWork` as `Account`, `AccountRole` and `Recipient`. Entity-specific repositories are added only as each entity's data access is actually needed (see the Quick Reference Checklist below). The examples in this document use a placeholder `Widget` entity — substitute a real, scaffolded entity name.

🚨 **Re-scaffolding overwrites the context constructor.** `--force` regenerates `Data/ScannerContext.cs` whole, so the `ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;` line in the constructor is lost on every re-scaffold and must be put back by hand (see "DbContext Configuration" below). With `--no-onconfiguring` the scaffolder emits no `OnConfiguring` method at all, which satisfies the "stays empty" rule — do not add one.

**Schema history**, newest first:

- 🚨 03/10/2026 — `docs/sql/2026-10-03-login-and-recipients.sql`: `Account.MustChangePassword` (bit, default 0) and `Account.SecurityStamp` (uniqueidentifier, default `newid()`), and the table `Recipient` (unique per `AccountId` + `Email`, FK to `Account` with NO ACTION). The login cookie carries `SecurityStamp` and is rejected when it no longer matches: **every code path that locks an account or changes its password must write a new stamp**, or the user's other devices stay signed in. Code that creates an `Account` sets `SecurityStamp = Guid.NewGuid()` explicitly (the in-memory test database ignores the SQL default).
- 02/10/2026 — `docs/sql/2026-10-02-initial-schema.sql`: the database, `AccountRole` (seeded with `ADMIN` and `COWORKER`) and `Account`. `Account.PasswordHash` is nullable on purpose: an account without a hash cannot sign in.

**Schema changes are recorded here**, newest first, one short 🚨 paragraph each: the date, the script in `docs/sql/`, what changed, and anything a later reader could get wrong (a rename where the old name survives somewhere on purpose, a cascade rule, a CHECK constraint EF does not scaffold, a value a test must pin).

If the database schema changes, re-run the scaffold command below with `--force` to regenerate `Models/` and `Data/ScannerContext.cs`, then reapply the two post-scaffold actions (they're idempotent — scaffolding regenerates `OnConfiguring` as empty already because of `--no-onconfiguring`, and `Repository.cs`/`UnitOfWork.cs` are untouched by re-scaffolding since they live outside `Models/`/`Data/`).

## Pattern Overview

The project uses two primary patterns:
1. **Repository Pattern** - Encapsulates data access logic for each entity
2. **Unit of Work Pattern** - Coordinates work across multiple repositories and manages transactions

## Core Principles

### 1. No Tracking by Default
All query operations use `AsNoTracking()` for better performance. Once `ScannerContext` is scaffolded, configure it with:
```csharp
ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
```

### 2. GUID Primary Keys
All entities use `Guid` as the primary key type (an `Id` property), defaulted at the database level via `HasDefaultValueSql("(newid())")` (this shows up automatically in scaffolded `OnModelCreating` code when the column has that default).

### 3. Explicit State Management
Since tracking is disabled, update/delete operations must explicitly manage entity state.

### 4. Database-First Approach
- The SQL Server database is the source of truth
- Entity Framework models are scaffolded FROM the existing database
- **NEVER** create tables via code or EF Core migrations

### 5. Exact Database Names, No Pluralization (diverges from VMCI)

VMCI.Scanner scaffolds with `--use-database-names --no-pluralize` (CLI) / `-UseDatabaseNames -NoPluralize` (PMC). This is a **deliberate departure from the sibling VMCI project**, which uses EF Core's default scaffolding conventions instead.

- **`--use-database-names`**: entity class names, property names, and column names come **exactly** from the database schema — EF's default "friendly name" conversion (e.g. renaming to PascalCase, splitting words) is skipped. What you see in SSMS is what you get in C#.
- **`--no-pluralize`**: `DbSet<T>` properties and collection navigation properties are **not** auto-pluralized. A table named `Widget` produces `DbSet<Widget> Widget` (not `Widgets`); a table already named `Widgets` produces `DbSet<Widget> Widgets`. Either way, the property name tracks the table name exactly — never assume it gets pluralized.

**Practical effect on this document**: every illustrative example below uses the placeholder table/entity name `Widget` and shows `Widgets`-style plural repository/DbSet properties purely as a familiar illustration. Once real entities are scaffolded, use whatever the actual (unpluralized, unrenamed) table name is — don't manually pluralize or PascalCase-normalize anything the scaffolder produced.

### 🚨 CRITICAL: Model Location and Scaffolding Rules

**WHERE TO SCAFFOLD MODELS:**

1. **ONLY scaffold models in the VMCI.Scanner.DB project** - NEVER in any other project
2. **All entity models MUST live in VMCI.Scanner.DB/Models/** directory
3. **All other projects access models by referencing the VMCI.Scanner.DB project**

**FORBIDDEN ACTIONS:**
- ❌ **NEVER** run scaffolding commands in VMCI.Scanner.WebApi
- ❌ **NEVER** run scaffolding commands in VMCI.Scanner.Shared
- ❌ **NEVER** run scaffolding commands in test projects
- ❌ **NEVER** create duplicate model files in other projects
- ❌ **NEVER** create a second DbContext in other projects

**CORRECT PROJECT STRUCTURE:**
```
VMCI.Scanner.DB/           ← Entity models and DbContext live HERE ONLY
├── Models/            ← All scaffolded entity models
├── Data/              ← ScannerContext (the ONLY DbContext)
├── Repositories/      ← Data access layer
└── UnitOfWork/        ← Transaction coordination

VMCI.Scanner.WebApi/        ← References VMCI.Scanner.DB project
├── Controllers/       ← Use models via: using VMCI.Scanner.DB.Models;
├── Services/          ← Use models via: using VMCI.Scanner.DB.Models;
├── DTOs/              ← API contracts (NOT entity models)
└── NO Models/ folder  ← Models should NOT exist here

VMCI.Scanner.Shared/        ← References VMCI.Scanner.DB if needed
└── Enums/             ← Shared enums only
```

**HOW OTHER PROJECTS ACCESS MODELS:**

Add project reference in .csproj:
```xml
<ItemGroup>
  <ProjectReference Include="..\VMCI.Scanner.DB\VMCI.Scanner.DB.csproj" />
</ItemGroup>
```

Use models with proper namespace:
```csharp
using VMCI.Scanner.DB.Models;  // Access entity models
using VMCI.Scanner.DB.Data;    // Access ScannerContext

public class MyService
{
    private readonly IUnitOfWork _unitOfWork;

    public async Task<Widget> GetWidgetAsync(Guid id)
    {
        return await _unitOfWork.Widgets.GetByIdAsync(id);
    }
}
```

### Scaffolding Command

Two equivalent ways to run the same EF Core scaffolder — use whichever fits your workflow. Both **MUST** target the VMCI.Scanner.DB project.

**CLI (`dotnet ef`), run from `backend/VMCI.Scanner.DB`:**
```powershell
cd backend/VMCI.Scanner.DB
dotnet ef dbcontext scaffold "Server=localhost;Database=cverhoest_scanner;Trusted_Connection=true;TrustServerCertificate=true;" Microsoft.EntityFrameworkCore.SqlServer -o Models --context-dir Data --context ScannerContext --force --no-onconfiguring --use-database-names --no-pluralize
```

**PMC (`Scaffold-DbContext`), from Visual Studio's Package Manager Console:**

> 🚨 Keep `-Namespace VMCI.Scanner.DB.Models -ContextNamespace VMCI.Scanner.DB.Data` on this command. The
> CLI form below derives those two namespaces from the output folders automatically; PMC does
> **not**, so omitting them (or passing a bare `-Namespace VMCI.Scanner.DB`) flattens every entity and
> the context into `VMCI.Scanner.DB` and breaks every `using VMCI.Scanner.DB.Models;` /
> `using VMCI.Scanner.DB.Data;` in the solution. The two commands must stay namespace-identical.
```powershell
Scaffold-DbContext "Server=localhost;Database=cverhoest_scanner;Trusted_Connection=True;TrustServerCertificate=True;" Microsoft.EntityFrameworkCore.SqlServer -ContextDir ./Data -OutputDir ./Models -Context ScannerContext -Namespace VMCI.Scanner.DB.Models -ContextNamespace VMCI.Scanner.DB.Data -Force -Project VMCI.Scanner.DB -UseDatabaseNames -NoPluralize -NoOnConfiguring
```

**If you need to specify a startup project (when VMCI.Scanner.DB can't build standalone), CLI:**
```powershell
cd backend/VMCI.Scanner.DB
dotnet ef dbcontext scaffold "connection-string-here" Microsoft.EntityFrameworkCore.SqlServer -o Models --context-dir Data --context ScannerContext --force --no-onconfiguring --use-database-names --no-pluralize --startup-project ../VMCI.Scanner.WebApi
```
PMC equivalent: set the **Default project** dropdown in the Package Manager Console to `VMCI.Scanner.WebApi` (the startup project) while keeping `-Project VMCI.Scanner.DB` pointed at the target project for the generated files.

### 🚨 CRITICAL POST-SCAFFOLD ACTION

**After EVERY scaffold command, IMMEDIATELY perform this action:**

1. Open `Data/ScannerContext.cs`
2. Remove the `optionsBuilder.UseSqlServer` statement from the `OnConfiguring` method
3. Keep the `OnConfiguring` method but make it empty

**Example of what to change:**

```csharp
// BEFORE (scaffolded code, only appears if you forgot --no-onconfiguring):
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    optionsBuilder.UseSqlServer("connection-string-here"); // REMOVE THIS LINE
}

// AFTER (corrected code):
protected override void OnConfiguring(DbContextOptionsBuilder optionsBuilder)
{
    // Keep method empty - database configuration handled by dependency injection
}
```

**Why this is critical:**

- The `optionsBuilder.UseSqlServer` statement conflicts with test configurations
- Integration tests need to use in-memory or otherwise DI-supplied database configuration
- Production uses dependency injection for database configuration
- Scaffolding regenerates this unwanted statement if `--no-onconfiguring` is omitted

### ⚠️ `modelBuilder.UseCollation(...)` comes and goes with the MACHINE, not with the schema

A scaffold on one PC adds this line at the top of `OnModelCreating`, a scaffold on the other removes
it again, and neither is a schema change:

```csharp
modelBuilder.UseCollation("SQL_Latin1_General_CP1_CI_AS");
```

EF's SQL Server scaffolder compares the **database** collation with the **instance** collation
(`SERVERPROPERTY('Collation')`) and writes the line only when the two differ. The `cverhoest_scanner`
database is `SQL_Latin1_General_CP1_CI_AS` — the classic SQL Server default, and it travels with the
database. What differs per machine is the instance it is attached to: an instance installed with
that same collation omits the line, one installed with another collation (for example
`Latin1_General_CI_AS`) writes it. The first scaffold of this project (02/10/2026) wrote the line.

**Keep whichever the last scaffold produced and do not hand-edit it either way.** The line states
something true about the database and nothing about the machine, EF Core migrations are not used
here, and the collation is not consulted at query time — so both versions behave identically. It is
noise in a diff, not a difference. If the churn ever becomes annoying, the fix is to make the two
instances' collations match at install time, not to fight the scaffolder.

### ✅ SECOND POST-SCAFFOLD ACTION (already applied): Plumbing uses the concrete context

`Repositories/Repository.cs`, `UnitOfWork/UnitOfWork.cs`, and `VMCI.Scanner.WebApi/Program.cs` (`AddDbContext<ScannerContext>`) all reference the concrete `ScannerContext` — this was a pure find-and-replace from the initial generic-`DbContext` scaffolding and is already done. If you ever re-scaffold with a brand new `--context` name, redo this step; otherwise nothing further is needed here.

### DbContext Configuration

```csharp
// Data/ScannerContext.cs (scaffolded, then modified)
public partial class ScannerContext : DbContext
{
    public ScannerContext(DbContextOptions<ScannerContext> options)
        : base(options)
    {
        // Disable tracking by default for better performance
        ChangeTracker.QueryTrackingBehavior = QueryTrackingBehavior.NoTracking;
    }

    public DbSet<Widget> Widgets { get; set; }
    // Additional DbSets will be added as more tables are scaffolded
    // All entities use GUID primary keys

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        // Scaffolded configuration
        base.OnModelCreating(modelBuilder);

        // Add custom configurations if needed
        // Global query filters for soft delete, etc.
    }
}
```

*(`Widget` is an illustrative placeholder entity — it does not exist. Substitute real, scaffolded entity names.)*

---

## Step-by-Step Implementation Guide

### Step 1: Entity Model (Scaffolded from Database)

Entities are scaffolded from the existing database. Illustrative example (`Widget` is a placeholder, not a real entity):

```csharp
// Models/Widget.cs
namespace VMCI.Scanner.DB.Models;

public partial class Widget
{
    public Guid Id { get; set; }
    public string Name { get; set; } = null!;
    public DateTime CreatedAt { get; set; }
}
```

**Key Points:**
- All entities have a `Guid Id` property
- Non-nullable reference types use `= null!;`
- Partial class allows for extensions
- Guid PKs typically have `HasDefaultValueSql("(newid())")` configured in `OnModelCreating` by the scaffolder when the column default is set in SQL Server

---

### Step 2: Base Repository Interface

The generic repository interface defines common CRUD operations:

```csharp
// Repositories/Repository.cs (interface portion)
public interface IRepository<T> where T : class
{
    // Query methods (read-only, use AsNoTracking)
    Task<T?> GetByIdAsync(Guid id);
    Task<IEnumerable<T>> GetAllAsync();
    Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate);
    Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate);
    Task<bool> AnyAsync(Expression<Func<T, bool>> predicate);
    Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null);

    // Command methods (non-saving, must call SaveChangesAsync separately)
    void Add(T entity);
    void AddRange(IEnumerable<T> entities);
    void Update(T entity);
    void Remove(T entity);
    void RemoveRange(IEnumerable<T> entities);
}
```

**Important**: Command methods (Add/Update/Remove) are **void** and do NOT call SaveChangesAsync().

This interface (and the base `Repository<T>` implementation) already exists in `Repositories/Repository.cs`, currently typed against the generic `DbContext`. See the "Update the plumbing" step above for retargeting it to `ScannerContext`.

---

### Step 3: Base Repository Implementation

```csharp
// Repositories/Repository.cs
public class Repository<T> : IRepository<T> where T : class
{
    protected readonly ScannerContext _context;
    protected readonly DbSet<T> _dbSet;

    public Repository(ScannerContext context)
    {
        _context = context;
        _dbSet = context.Set<T>();
    }

    public async Task<T?> GetByIdAsync(Guid id)
    {
        return await _dbSet.AsNoTracking()
                          .FirstOrDefaultAsync(e => EF.Property<Guid>(e, "Id") == id);
    }

    public async Task<IEnumerable<T>> GetAllAsync()
    {
        return await _dbSet.AsNoTracking().ToListAsync();
    }

    public async Task<IEnumerable<T>> FindAsync(Expression<Func<T, bool>> predicate)
    {
        return await _dbSet.AsNoTracking().Where(predicate).ToListAsync();
    }

    public async Task<T?> FirstOrDefaultAsync(Expression<Func<T, bool>> predicate)
    {
        return await _dbSet.AsNoTracking().FirstOrDefaultAsync(predicate);
    }

    public async Task<bool> AnyAsync(Expression<Func<T, bool>> predicate)
    {
        return await _dbSet.AnyAsync(predicate);
    }

    public async Task<int> CountAsync(Expression<Func<T, bool>>? predicate = null)
    {
        return predicate == null
            ? await _dbSet.CountAsync()
            : await _dbSet.CountAsync(predicate);
    }

    public void Add(T entity)
    {
        _dbSet.Add(entity);
    }

    public void AddRange(IEnumerable<T> entities)
    {
        _dbSet.AddRange(entities);
    }

    public void Update(T entity)
    {
        _context.Entry(entity).State = EntityState.Modified;
    }

    public void Remove(T entity)
    {
        if (_context.Entry(entity).State == EntityState.Detached)
        {
            _dbSet.Attach(entity);
        }
        _dbSet.Remove(entity);
    }

    public void RemoveRange(IEnumerable<T> entities)
    {
        foreach (var entity in entities)
        {
            if (_context.Entry(entity).State == EntityState.Detached)
            {
                _dbSet.Attach(entity);
            }
        }
        _dbSet.RemoveRange(entities);
    }
}
```

---

### Step 4: Entity-Specific Repository Interface

Create an interface that extends `IRepository<T>`:

```csharp
// Repositories/WidgetRepository.cs (interface portion)
public interface IWidgetRepository : IRepository<Widget>
{
    // Add entity-specific methods here
    Task<Widget?> GetByNameAsync(string name);
    Task<bool> NameExistsAsync(string name);
}
```

**Pattern Rules:**
- Interface name: `I{EntityName}Repository`
- Extends `IRepository<TEntity>`
- Add only entity-specific query and command methods
- Use nullable return types (`?`) for methods that may not find results

---

### Step 5: Entity-Specific Repository Implementation

```csharp
// Repositories/WidgetRepository.cs
public class WidgetRepository : Repository<Widget>, IWidgetRepository
{
    public WidgetRepository(ScannerContext context) : base(context)
    {
    }

    public async Task<Widget?> GetByNameAsync(string name)
    {
        return await _dbSet.AsNoTracking()
                          .FirstOrDefaultAsync(w => w.Name == name);
    }

    public async Task<bool> NameExistsAsync(string name)
    {
        return await _dbSet.AnyAsync(w => w.Name == name);
    }
}
```

**Implementation Checklist:**
- [ ] Class name: `{EntityName}Repository`
- [ ] Extends `Repository<TEntity>`
- [ ] Implements `I{EntityName}Repository`
- [ ] Constructor accepts `ScannerContext` and passes to base
- [ ] Read operations use `AsNoTracking()`
- [ ] Update operations use `AsTracking()` when needed
- [ ] Use `_dbSet` for queries (protected property from base class)
- [ ] Use `_context` for direct DbContext access when needed

---

### Step 6: Update Unit of Work Interface

Add the new repository property to `IUnitOfWork`:

```csharp
// UnitOfWork/IUnitOfWork.cs
public interface IUnitOfWork : IDisposable
{
    IWidgetRepository Widgets { get; }
    // Add new repository here for each entity

    Task<int> SaveChangesAsync();
    Task BeginTransactionAsync();
    Task CommitAsync();
    Task RollbackAsync();
}
```

---

### Step 7: Update Unit of Work Implementation

Initialize the repository in the constructor:

```csharp
// UnitOfWork/UnitOfWork.cs
public class UnitOfWork : IUnitOfWork
{
    private readonly ScannerContext _context;
    private IDbContextTransaction? _transaction;

    public UnitOfWork(ScannerContext context)
    {
        _context = context;

        // Initialize all repositories
        Widgets = new WidgetRepository(_context);
        // Add new repositories here
    }

    public IWidgetRepository Widgets { get; }
    // Add property for each repository

    public async Task<int> SaveChangesAsync()
    {
        return await _context.SaveChangesAsync();
    }

    public async Task BeginTransactionAsync()
    {
        _transaction = await _context.Database.BeginTransactionAsync();
    }

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

    public async Task RollbackAsync()
    {
        if (_transaction != null)
        {
            await _transaction.RollbackAsync();
            _transaction.Dispose();
            _transaction = null;
        }
    }

    public void Dispose()
    {
        _transaction?.Dispose();
        _context.Dispose();
    }
}
```

---

## Usage Examples

### Simple CRUD Operations

```csharp
// Controller or Service class
public class WidgetService
{
    private readonly IUnitOfWork _unitOfWork;

    public WidgetService(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    // Create
    public async Task<Widget> CreateWidgetAsync(Widget widget)
    {
        _unitOfWork.Widgets.Add(widget);
        await _unitOfWork.SaveChangesAsync();
        return widget;
    }

    // Read
    public async Task<Widget?> GetWidgetByIdAsync(Guid id)
    {
        return await _unitOfWork.Widgets.GetByIdAsync(id);
    }

    // Update
    public async Task<bool> UpdateWidgetAsync(Widget widget)
    {
        _unitOfWork.Widgets.Update(widget);
        var result = await _unitOfWork.SaveChangesAsync();
        return result > 0;
    }

    // Delete
    public async Task<bool> DeleteWidgetAsync(Widget widget)
    {
        _unitOfWork.Widgets.Remove(widget);
        var result = await _unitOfWork.SaveChangesAsync();
        return result > 0;
    }

    // Custom query
    public async Task<bool> NameExistsAsync(string name)
    {
        return await _unitOfWork.Widgets.NameExistsAsync(name);
    }
}
```

### Transaction Example

```csharp
public async Task<bool> TransferDataAsync(Guid fromId, Guid toId)
{
    await _unitOfWork.BeginTransactionAsync();

    try
    {
        // Perform multiple operations
        var from = await _unitOfWork.Widgets.GetByIdAsync(fromId);
        var to = await _unitOfWork.Widgets.GetByIdAsync(toId);

        // Make changes
        _unitOfWork.Widgets.Update(from);
        _unitOfWork.Widgets.Update(to);

        // Commit all changes
        await _unitOfWork.CommitAsync();
        return true;
    }
    catch
    {
        await _unitOfWork.RollbackAsync();
        throw;
    }
}
```

### When to Call SaveChangesAsync?

**Option 1: Let the caller (service/controller) save**
```csharp
// Repository uses base methods only
_unitOfWork.Widgets.Add(widget);
await _unitOfWork.SaveChangesAsync();
```

**Option 2: Save within repository for complete operations**
```csharp
// Repository method handles a complete business operation
public async Task<bool> RenameAsync(Guid id, string newName)
{
    var widget = await _context.Widgets
        .AsTracking()
        .FirstOrDefaultAsync(w => w.Id == id);

    if (widget == null) return false;

    widget.Name = newName;

    await _context.SaveChangesAsync(); // Save here
    return true;
}
```

**Guideline**: Use Option 2 when the repository method represents a complete, atomic business operation. Use Option 1 for basic CRUD operations.

---

## Quick Reference Checklist

When adding a new entity, follow these steps in order:

1. **Scaffold the entity** from the database (if not already done)
2. **Create repository interface** in same file as implementation
   - Name: `I{EntityName}Repository`
   - Extend `IRepository<TEntity>`
   - Add entity-specific methods
3. **Create repository implementation** in `Repositories/{EntityName}Repository.cs`
   - Extend `Repository<TEntity>`
   - Implement the interface
   - Constructor accepts `ScannerContext`
   - Use `AsNoTracking()` for reads
   - Use `AsTracking()` for updates if needed
4. **Update IUnitOfWork interface**
   - Add property: `I{EntityName}Repository {EntityName} { get; }` — use the **exact scaffolded DbSet name** (not manually pluralized; `--no-pluralize` means it matches the table name as-is)
5. **Update UnitOfWork implementation**
   - Add property: `public I{EntityName}Repository {EntityName} { get; }`
   - Initialize in constructor: `{EntityName} = new {EntityName}Repository(_context);`

---

## Design Decisions & Rationale

### Why No Tracking by Default?
- **Performance**: Tracking adds overhead for read operations
- **Scalability**: Most queries are read-only
- **Explicit Updates**: Forces developers to be intentional about modifications

### Why Separate Repository Methods Don't Save?
- **Flexibility**: Allows multiple operations before committing
- **Transactions**: Enables proper transaction boundaries
- **Unit of Work**: Centralizes change persistence

### Why GUID Primary Keys?
- **Distributed Systems**: Can generate IDs without database round-trip
- **Scalability**: No single point of contention for ID generation
- **Security**: Non-sequential IDs prevent enumeration attacks

---

## File Structure (Target End-State)

```
VMCI.Scanner.DB/
├── Models/
│   ├── Widget.cs       (illustrative - not a real entity yet)
│   └── ...
├── Repositories/
│   ├── Repository.cs (base class with IRepository<T> interface)
│   └── WidgetRepository.cs (with IWidgetRepository interface)
├── UnitOfWork/
│   ├── IUnitOfWork.cs
│   └── UnitOfWork.cs
└── Data/
    └── ScannerContext.cs
```

---

## Common Pitfalls to Avoid

1. **Forgetting AsNoTracking()**: Always use it for read-only queries in custom methods
2. **Not calling SaveChangesAsync()**: Command methods (Add/Update/Remove) don't persist automatically
3. **Mixing tracked and untracked entities**: Be explicit about tracking behavior
4. **Direct DbContext usage in services**: Always use repositories through UnitOfWork
5. **Not disposing UnitOfWork**: Ensure proper disposal in controllers/services
6. **Wrong context name**: The DbContext class must be `ScannerContext` (PascalCase), matching the `--context ScannerContext` scaffold flag

---

## Scaffolding Commands

```powershell
# Scaffold from existing database (run from VMCI.Scanner.DB directory)
cd backend/VMCI.Scanner.DB
dotnet ef dbcontext scaffold "Server=localhost;Database=cverhoest_scanner;Trusted_Connection=true;TrustServerCertificate=true;" Microsoft.EntityFrameworkCore.SqlServer -o Models --context-dir Data --context ScannerContext --force --no-onconfiguring --use-database-names --no-pluralize

# PMC equivalent (Visual Studio Package Manager Console):
# Scaffold-DbContext "Server=localhost;Database=cverhoest_scanner;Trusted_Connection=True;TrustServerCertificate=True;" Microsoft.EntityFrameworkCore.SqlServer -ContextDir ./Data -OutputDir ./Models -Context ScannerContext -Namespace VMCI.Scanner.DB.Models -ContextNamespace VMCI.Scanner.DB.Data -Force -Project VMCI.Scanner.DB -UseDatabaseNames -NoPluralize -NoOnConfiguring

# After scaffolding, manually confirm in Data/ScannerContext.cs:
# - OnConfiguring() is empty (no connection string in code — configuration is via DI)
# - Guid PKs came through with HasDefaultValueSql("(newid())") where the DB column defaults to newid()
#
# Then retarget the generic-DbContext plumbing to the concrete ScannerContext:
# - Repositories/Repository.cs: DbContext -> ScannerContext
# - UnitOfWork/UnitOfWork.cs: DbContext -> ScannerContext
# - VMCI.Scanner.WebApi/Program.cs: AddDbContext<DbContext> -> AddDbContext<ScannerContext>
```

# VMCI.Scanner Backend Architecture

This document describes the overall architecture and project organization for the VMCI.Scanner backend solution.

## Project Structure

```
backend/
├── VMCI.Scanner.DB/              ← Data Access Layer (Entity Models, DbContext, Repositories)
├── VMCI.Scanner.WebApi/          ← API Layer (Controllers, Services, DTOs)
├── VMCI.Scanner.Shared/          ← Shared Code (Enums, Constants, etc.)
├── VMCI.Scanner.DevTools/         ← Console app for one-off admin/dev tasks (create-account, ...)
├── VMCI.Scanner.Tests.Unit/      ← Unit Tests
└── VMCI.Scanner.Tests.Integration/ ← Integration Tests
```

## 🚨 CRITICAL: Entity Model Location Rules

### Single Source of Truth for Database Models

**Entity models exist in ONE place ONLY: `VMCI.Scanner.DB/Models/`**

### Scaffolding Rules

1. **✅ DO** run EF Core scaffolding commands ONLY in the `VMCI.Scanner.DB` project
2. **❌ NEVER** run scaffolding commands in any other project
3. **❌ NEVER** create duplicate model files in other projects
4. **❌ NEVER** create a DbContext outside of `VMCI.Scanner.DB`

### Correct Command Usage

```powershell
# ✅ CORRECT - Run from VMCI.Scanner.DB directory
cd backend/VMCI.Scanner.DB
dotnet ef dbcontext scaffold "connection-string" Microsoft.EntityFrameworkCore.SqlServer -o Models --context-dir Data --context ScannerContext --force --no-onconfiguring --use-database-names --no-pluralize

# ❌ WRONG - Never run from WebApi
cd backend/VMCI.Scanner.WebApi
dotnet ef dbcontext scaffold ...  # THIS IS WRONG!
```

## Project Responsibilities

### VMCI.Scanner.DB - Data Access Layer

**Purpose:** Encapsulates ALL database access logic

**Contains:**
- ✅ Entity models (scaffolded from the database, once it exists)
- ✅ DbContext (ScannerContext)
- ✅ Repositories (generic and entity-specific)
- ✅ Unit of Work pattern implementation

**Does NOT contain:**
- ❌ Controllers
- ❌ DTOs (Data Transfer Objects)
- ❌ Business logic
- ❌ API concerns

**Referenced by:** VMCI.Scanner.WebApi, test projects

**See:** `backend/VMCI.Scanner.DB/CLAUDE.md` for complete data access patterns

---

### VMCI.Scanner.WebApi - API Layer

**Purpose:** Exposes HTTP API endpoints

**Contains:**
- ✅ Controllers (handle HTTP requests/responses)
- ✅ Services (business logic)
- ✅ DTOs (API contracts)
- ✅ Authentication/Authorization
- ✅ API configuration

**Does NOT contain:**
- ❌ Entity models (use VMCI.Scanner.DB.Models)
- ❌ DbContext (use VMCI.Scanner.DB.Data.ScannerContext)
- ❌ Repositories (use IUnitOfWork from VMCI.Scanner.DB)

**References:** VMCI.Scanner.DB, VMCI.Scanner.Shared

**See:** `backend/VMCI.Scanner.WebApi/CLAUDE.md` for API patterns

---

### VMCI.Scanner.Shared - Shared Code

**Purpose:** Code shared across multiple projects

**Contains:**
- ✅ Enums
- ✅ Constants
- ✅ Common utilities

**Does NOT contain:**
- ❌ Entity models
- ❌ DbContext
- ❌ Repositories

**Referenced by:** VMCI.Scanner.DB, VMCI.Scanner.WebApi, test projects

---

### Further projects

An integration or engine gets its own project (`VMCI.Scanner.<Capability>`) with its own `CLAUDE.md`, is referenced by WebApi for DI registration, and is registered in `Program.cs` **only when its configuration is complete** (logging "skipped: not configured" otherwise). Add a section here for each one: purpose, contains, does NOT contain, referenced by.

---

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────┐
│ HTTP Request                                         │
└─────────────────────┬───────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────┐
│ VMCI.Scanner.WebApi - API Layer                          │
│                                                      │
│ ┌──────────────┐    ┌──────────────┐               │
│ │ Controller   │───▶│ Service      │               │
│ │ (HTTP)       │    │ (Logic)      │               │
│ └──────────────┘    └──────┬───────┘               │
│                             │                        │
│                      uses IUnitOfWork                │
└─────────────────────────────┼───────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────┐
│ VMCI.Scanner.DB - Data Access Layer                      │
│                                                      │
│ ┌──────────────┐    ┌──────────────┐               │
│ │ UnitOfWork   │───▶│ Repository   │               │
│ │              │    │              │               │
│ └──────────────┘    └──────┬───────┘               │
│                             │                        │
│                      ┌──────▼───────┐               │
│                      │ScannerContext│               │
│                      │ (DbContext)  │               │
│                      └──────┬───────┘               │
└─────────────────────────────┼───────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────┐
│ SQL Server Database                                  │
└─────────────────────────────────────────────────────┘
```

## How to Access Entity Models

### ❌ WRONG - Duplicating Models

```csharp
// DON'T DO THIS - Creating duplicate models
namespace VMCI.Scanner.WebApi.Models;  // ❌ WRONG PROJECT

public class Widget  // ❌ Duplicate of VMCI.Scanner.DB.Models.Widget
{
    public Guid Id { get; set; }
    // ...
}
```

### ✅ CORRECT - Referencing from VMCI.Scanner.DB

```csharp
// Controllers and Services in VMCI.Scanner.WebApi
using VMCI.Scanner.DB.Models;        // ✅ Entity models
using VMCI.Scanner.DB.UnitOfWork;    // ✅ Data access

namespace VMCI.Scanner.WebApi.Controllers;

[ApiController]
[Route("api/[controller]")]
public class WidgetsController : ControllerBase
{
    private readonly IUnitOfWork _unitOfWork;

    public WidgetsController(IUnitOfWork unitOfWork)
    {
        _unitOfWork = unitOfWork;
    }

    [HttpGet("{id}")]
    public async Task<ActionResult<WidgetDto>> GetWidget(Guid id)
    {
        // ✅ Access entity via UnitOfWork pattern
        var widget = await _unitOfWork.Widgets.GetByIdAsync(id);

        if (widget == null)
            return NotFound();

        // ✅ Map entity to DTO for API response
        var dto = MapToDto(widget);
        return Ok(dto);
    }

    private WidgetDto MapToDto(Widget entity)
    {
        return new WidgetDto
        {
            Id = entity.Id,
            Name = entity.Name,
            // Only expose what the API needs
        };
    }
}
```

*(`Widget` above is an illustrative placeholder entity name — no such entity exists yet. Replace it with real entities once the database is scaffolded.)*

## Entity Models vs DTOs

### Entity Models (VMCI.Scanner.DB.Models)

- **Purpose:** Represent database tables
- **Location:** `VMCI.Scanner.DB/Models/`
- **Usage:** Internal data access only
- **Features:**
  - Navigation properties
  - All database columns
  - EF Core tracking
  - Database constraints

### DTOs (VMCI.Scanner.WebApi.DTOs)

- **Purpose:** API contracts (request/response)
- **Location:** `VMCI.Scanner.WebApi/DTOs/`
- **Usage:** HTTP communication
- **Features:**
  - No navigation properties
  - Only exposed fields
  - Validation attributes
  - Serialization-friendly

## Database-First Workflow

This project uses a **database-first** approach:

1. **Database changes made in SQL Server directly**
2. **Scaffold models** to sync code with database (in VMCI.Scanner.DB only)
3. **Update repositories** if new entities are added
4. **Create DTOs** in VMCI.Scanner.WebApi for API contracts
5. **Implement controllers/services** using IUnitOfWork

## Common Mistakes to Avoid

1. ❌ Running `dotnet ef dbcontext scaffold` in VMCI.Scanner.WebApi
2. ❌ Creating a Models/ folder in VMCI.Scanner.WebApi
3. ❌ Creating a second DbContext
4. ❌ Exposing entity models directly in API responses (use DTOs)
5. ❌ Using DbContext directly in controllers (use IUnitOfWork)

## Getting Started

### For New Developers

1. **Read this document first**
2. **Read `backend/VMCI.Scanner.DB/CLAUDE.md`** for data access patterns
3. **Read `backend/VMCI.Scanner.WebApi/CLAUDE.md`** for API patterns
4. **Never scaffold models outside of VMCI.Scanner.DB**

### For AI Assistants

When working on this codebase:

1. **Entity models ONLY in VMCI.Scanner.DB/Models/**
2. **Scaffolding commands ONLY in VMCI.Scanner.DB/**
3. **DTOs in VMCI.Scanner.WebApi/DTOs/** for API contracts
4. **Always use IUnitOfWork** for data access
5. **If you see duplicate models, flag them for deletion**

## Current state

Keep this section current. At scaffold time: `ScannerContext` is scaffolded with `Account` and `AccountRole`, the repository/unit-of-work plumbing targets the concrete context, and login is the only feature.

## Questions?

- Data access patterns: See `backend/VMCI.Scanner.DB/CLAUDE.md`
- API patterns: See `backend/VMCI.Scanner.WebApi/CLAUDE.md`
- General architecture: This document

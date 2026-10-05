# VMCI.Scanner.WebApi Project Guidelines

## Architecture Decisions

## 🚨 CRITICAL: Entity Models and Database Access

### DO NOT Create Entity Models in This Project

**IMPORTANT RULES:**

1. **❌ NEVER run EF Core scaffolding commands in this project**
2. **❌ NEVER create a Models/ folder with entity models in this project**
3. **❌ NEVER create a DbContext in this project**
4. **✅ ALWAYS reference the VMCI.Scanner.DB project for entity models**
5. **✅ ONLY create DTOs (Data Transfer Objects) in the DTOs/ folder**

### Correct Data Access Pattern

**Entity models live in VMCI.Scanner.DB ONLY:**
```csharp
// ✅ CORRECT - Reference models from VMCI.Scanner.DB
using VMCI.Scanner.DB.Models;
using VMCI.Scanner.DB.UnitOfWork;

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
        // Get entity from database via VMCI.Scanner.DB
        var widget = await _unitOfWork.Widgets.GetByIdAsync(id);

        if (widget == null)
            return NotFound();

        // Map to DTO for API response
        var dto = new WidgetDto
        {
            Id = widget.Id,
            Name = widget.Name,
            // ... map other properties
        };

        return Ok(dto);
    }
}
```

*(`Widget`/`WidgetDto` above are illustrative placeholder names - no such entity exists yet.)*

**DTOs are for API contracts ONLY:**
```csharp
// ✅ CORRECT - DTOs live in VMCI.Scanner.WebApi/DTOs/
namespace VMCI.Scanner.WebApi.DTOs;

public class WidgetDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    // Properties exposed to the API (may differ from entity)
}

public class CreateWidgetRequest
{
    public string Name { get; set; } = string.Empty;
    // Properties for creating a widget
}
```

### Project Structure

```
VMCI.Scanner.WebApi/
├── Controllers/       ← Use VMCI.Scanner.DB.Models via IUnitOfWork
├── Services/          ← Business logic, use IUnitOfWork
├── DTOs/              ← API contracts
├── Extensions/        ← ControllerBase extension methods (current-user helpers, etc.)
├── Middleware/         ← Custom ASP.NET Core middleware
├── Configuration/     ← Configuration loading (SecretsFile)
├── CLAUDE.md          ← This file
├── Program.cs         ← Registers DB context/services from VMCI.Scanner.DB
└── NO Models/ folder  ← Entity models DO NOT belong here
└── NO Data/ folder    ← DbContext DOES NOT belong here
```

**If you see entity model files in VMCI.Scanner.WebApi/Models/ or a DbContext in VMCI.Scanner.WebApi/Data/, they are mistakes and should be deleted.**

For complete data access documentation, see: `backend/VMCI.Scanner.DB/CLAUDE.md`

---

### Controllers

**Use full WebAPI controllers - NO declarative/minimal API endpoints.**

This project should use traditional ASP.NET Core WebAPI controllers with the `[ApiController]` attribute and routing attributes. Do not use minimal APIs (e.g., `app.MapGet`, `app.MapPost`, etc.).

#### Example Structure

```csharp
[ApiController]
[Route("api/[controller]")]
public class WeatherForecastController : ControllerBase
{
    [HttpGet]
    public ActionResult<IEnumerable<WeatherForecast>> Get()
    {
        // Implementation
    }
}
```

#### Required Setup in Program.cs

Ensure the following services are registered:
- `services.AddControllers();`
- `endpoints.MapControllers();`

Do not use:
- `app.MapGet()`
- `app.MapPost()`
- `app.MapPut()`
- `app.MapDelete()`
- Or any other minimal API mapping methods

---

## Configuration & Secrets

### Keys that must not reach GitHub: `backend/secrets/appsettings.secrets.json`

GitHub's secret scanning recognises several key formats (Anthropic `sk-ant-…`, Azure, OpenAI, …) and can have them revoked or the push blocked. Such keys live in `backend/secrets/appsettings.secrets.json` (and `appsettings.secrets.{Environment}.json`) — gitignored, found at `../secrets/` relative to the WebApi content root, or at `./secrets/` inside it on the Plesk host whose application pool cannot read above the site root (see `docs/deployment.md`), in the same shape as `appsettings.json`. Certificates (`*.pfx`) live in the same folder.

- Loaded by `SecretsFile.AddSecretsFile` directly after the `appsettings*.json` files: it beats their values; user secrets and environment variables still beat it.
- The file itself is optional to the loader, and startup logs
  `Secrets files loaded: <paths>` or `No secrets files found`.
- 🚨 **`DocumentIntelligence:Key` lives here and nowhere else**; the committed `appsettings.json`
  leaves it empty. Without it the API starts and makes image-only PDFs.
- 🚨 **`Anthropic:ApiKey` lives here too** (Scanner's own key). Without it the API starts and
  suggests no document names.
- 🚨 **The Data Protection keys live next to it**, in `data-protection-keys/` inside the secrets folder (or
  `DataProtection:KeysPath`). They encrypt the login cookie: lose them and every device is signed
  out. See `docs/security.md`.
- 🚨 **Not in git, so it does not travel.** Every other development machine and every server needs its own copy (see `docs/claude-multi-machine.md`).

### Everything else

Which values may sit in the committed `appsettings.json` is a decision for the user, recorded in `docs/security.md`. Until it is made, put nothing secret there. `dotnet user-secrets` overrides whatever is committed:
```powershell
dotnet user-secrets set "DocumentIntelligence:Key" "..."
```

## Authentication (cookie)

See `docs/security.md` for the full picture. In code:

- `Auth/ScannerClaims.cs` builds the principal; `Auth/AccountSessionValidator.cs` re-checks it against
  the database on every request. A new endpoint needs nothing extra for that.
- **Every new endpoint is blocked while the user still has a temporary password**
  (`PasswordChangeRequiredFilter`, global). Mark an action `[AllowWhilePasswordChangeRequired]` only
  if a user must reach it before choosing a password — that list is deliberately short.
- Administrator endpoints use `[Authorize(Policy = ScannerClaims.AdminPolicy)]`.
- Code that locks an account or changes a password writes `account.SecurityStamp = Guid.NewGuid()`,
  and, when it is the caller's own account, re-issues the cookie with `AuthController.SignInAsync`.
- Integration tests use a cookie client: `ScannerWebApplicationFactory.CreateCookieClient()` (HTTPS,
  since the cookie is `Secure`) and `SeedAccountAsync`. All test classes share one factory through
  `[Collection(ApiCollection.Name)]` — a second host in the same process fails to start.

`appsettings.Development.json` contains a Windows-auth localhost connection string (`Trusted_Connection=true`), which is not a secret and is safe to commit.

### Integrations are registered only when configured

Every optional integration is registered in `Program.cs` only when its options are complete, and logs `<Integration> skipped: … not configured` otherwise. The app must always start without them. A controller that needs an optional service resolves it via `IServiceProvider.GetService` and answers 503 when it is absent, rather than taking it in its constructor.

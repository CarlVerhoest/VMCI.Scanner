# VMCI.Scanner

VMCI App for quick sharing of pdf files from photos or images.

Database first on SQL Server, a .NET 10 Web API and a React/Vite frontend. The conventions that bind
everyone working here, people and Claude Code alike, are in [CLAUDE.md](CLAUDE.md) and the
sub-project guides it links to.

## Prerequisites

- **.NET 10 SDK**
- **Node.js LTS** (with npm)
- **SQL Server** on `localhost`, reachable with Windows authentication
- **`dotnet-ef`** global tool, for scaffolding: `dotnet tool install --global dotnet-ef`
- **PowerShell 7** — every script and every command in this repository is PowerShell
- Optional: **mkcert**, for HTTPS on the Vite dev server (see `frontend/VMCI.Scanner.App/vite.config.ts`)

## First-time setup on a new machine

In this order:

1. **Clone to `C:\DATA\Cave\MyRepos\VMCI.Scanner`.** The path must be identical on every machine:
   Claude Code's project memory is filed under the absolute path. See
   [docs/claude-multi-machine.md](docs/claude-multi-machine.md).

2. **Link Claude's memory to the repository** (once per machine, non-elevated):

   ```powershell
   .\scripts\setup-claude-memory.ps1
   ```

3. **Create the database.** Run the scripts in `docs/sql/` in date order (the file names sort by
   date) against `localhost`, in SSMS or with `sqlcmd`. They are re-runnable.

4. **Copy `backend/secrets/appsettings.secrets.json`** from a machine that has it — by hand, never
   through git or a chat. It holds the Azure OCR key; without it the API still starts and makes
   image-only PDFs. The folder is gitignored; the API creates `data-protection-keys/` in it on first
   start. See [docs/security.md](docs/security.md).

5. **Trust the .NET development certificate**, if this machine has not done so yet:

   ```powershell
   dotnet dev-certs https --trust
   ```

6. **Install the frontend dependencies:**

   ```powershell
   npm install --prefix frontend\VMCI.Scanner.App
   ```

7. **Create the first administrator.** The password is asked twice at a prompt that does not echo:

   ```powershell
   dotnet run --project backend\VMCI.Scanner.DevTools -- create-account --email <e> --first-name <f> --surname <s> --role ADMIN
   ```

   Run it while the API is **not** running, or add `--no-build` after `dotnet run`. DevTools
   references the API project, so a normal `dotnet run` rebuilds the API too, and that fails with
   `MSB3027 … file is locked by VMCI.Scanner.WebApi` when the running API holds its own files.

8. **Start both servers:**

   ```powershell
   .\scripts\run-dev.ps1
   ```

   The application is at <http://localhost:3300>; the API is at <https://localhost:7300> and the
   dev server proxies `/api` to it. In development the API's own root (`https://localhost:7300/`)
   has no frontend to serve — use port 3300.

   Claude Code sessions start the same two servers from `.claude/launch.json` (`scanner-api`,
   `scanner-dev`) instead of this script.

   **On a phone** the camera, the login cookie (`Secure`) and PWA installation all need HTTPS, so
   testing from a phone on the local network needs the mkcert certificates for the Vite dev server
   (see `vite.config.ts`), with the machine's LAN name or address added to the certificate.

## Everyday commands

```powershell
.\scripts\build.ps1
```

Frontend type-check, lint and build, then the backend in Release.

```powershell
dotnet test backend\VMCI.Scanner.sln
```

Unit and integration tests. They need neither SQL Server nor the secrets folder.

```powershell
npm test --prefix frontend\VMCI.Scanner.App
```

The scanner module's geometry tests (Vitest).

## Changing the database

The database is the source of truth. A schema change is a dated, re-runnable script in `docs/sql/`
that you run yourself — never an EF migration. Afterwards, re-scaffold from
`backend/VMCI.Scanner.DB`:

```powershell
Set-Location backend\VMCI.Scanner.DB
dotnet ef dbcontext scaffold "Server=localhost;Database=cverhoest_scanner;Trusted_Connection=true;TrustServerCertificate=true;" Microsoft.EntityFrameworkCore.SqlServer -o Models --context-dir Data --context ScannerContext --force --no-onconfiguring --use-database-names --no-pluralize
```

Then put the `NoTracking` line back in the `ScannerContext` constructor and record the change, as
described in [backend/VMCI.Scanner.DB/CLAUDE.md](backend/VMCI.Scanner.DB/CLAUDE.md).

## Layout

```
├── .claude/      settings, dev-server definitions and Claude's project memory (all tracked)
├── docs/         domain, status, security, deployment, sql/ scripts, Sampledocs/
├── scripts/      setup-claude-memory.ps1, build.ps1, run-dev.ps1
├── backend/
│   ├── secrets/                      gitignored: appsettings.secrets.json, certificates
│   ├── VMCI.Scanner.DB/              scaffolded models, ScannerContext, repositories, unit of work
│   ├── VMCI.Scanner.Shared/          enums, constants, value types
│   ├── VMCI.Scanner.WebApi/          controllers, services, DTOs
│   ├── VMCI.Scanner.Pdf/             image PDF (PDFsharp) and OCR (Azure Document Intelligence)
│   ├── VMCI.Scanner.DevTools/        console app: create-account
│   ├── VMCI.Scanner.Tests.Unit/
│   └── VMCI.Scanner.Tests.Integration/
└── frontend/
    └── VMCI.Scanner.App/             Vite + React + TypeScript
        └── src/scanner/              the reusable scanner module (OpenCV.js), see its README
```

## Documentation

- [docs/Domain.md](docs/Domain.md) — the business domain (skeleton for now)
- [docs/scan-app-plan.md](docs/scan-app-plan.md) — the build plan; section 0 lists where the owner changed it
- [docs/Project-Status.md](docs/Project-Status.md) — what is done and what is next
- [docs/security.md](docs/security.md) — authentication, secrets, open decisions
- [docs/deployment.md](docs/deployment.md) — building and publishing
- [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) — how the backend projects relate

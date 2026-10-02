# Deployment

The API serves the built frontend: one process, one origin. The frontend is built, copied into the
API's `wwwroot/`, and the API is published with it.

The hosting target has not been chosen yet. This document covers what is the same for any Windows
server; add the hosting-specific steps here once it is decided.

## Build and publish

Run from the repository root, in PowerShell 7.

1. Build the frontend:

   ```powershell
   Push-Location frontend\VMCI.Scanner.App
   npm ci
   npm run build
   Pop-Location
   ```

2. Copy `dist/` into the API's `wwwroot/`, replacing what was there (`.gitkeep` stays):

   ```powershell
   $wwwroot = 'backend\VMCI.Scanner.WebApi\wwwroot'
   Get-ChildItem $wwwroot -Exclude .gitkeep | Remove-Item -Recurse -Force
   Copy-Item frontend\VMCI.Scanner.App\dist\* $wwwroot -Recurse
   ```

   The contents of `wwwroot/` are gitignored; only `.gitkeep` is tracked.

3. Publish the API. The publish output includes `wwwroot/`:

   ```powershell
   dotnet publish backend\VMCI.Scanner.WebApi -c Release -o artifacts\publish
   ```

4. Copy `artifacts\publish\` to the server.

## What must exist on the server

- **The .NET 10 ASP.NET Core runtime.**
- **`ASPNETCORE_ENVIRONMENT`** set to `Production`. Without it nothing selects the production
  settings.
- **The secrets folder.** The API looks for `..\secrets\appsettings.secrets.json` relative to its
  content root, so the folder sits **next to** the published folder, not inside it:

  ```
  <site>\
  ├── publish\      ← the published API (content root)
  └── secrets\
      └── appsettings.secrets.json
  ```

  It must contain at least `Jwt:Key`; the API refuses to start without one. Use a key generated for
  that server, not a development key. See `docs/security.md`.
- **The connection string**, `ConnectionStrings:DefaultConnection`. The committed `appsettings.json`
  leaves it empty on purpose. Supply it in the secrets file or as the environment variable
  `ConnectionStrings__DefaultConnection`. If it is missing the API still starts, logs a warning, and
  every endpoint that touches the database answers 500.
- **`Frontend:BaseUrl`**, the public URL of the site (for example `https://scanner.example.be`).
  Outside Development it is the only origin CORS allows. Supply it the same way as the connection
  string.
- **The database.** Run the scripts in `docs/sql/` in date order against the server's SQL Server,
  then create the first administrator:

  ```powershell
  dotnet run --project backend\VMCI.Scanner.DevTools -- create-account --email <e> --first-name <f> --surname <s> --role ADMIN --environment Production --confirm-production
  ```

  DevTools reads its settings from the `VMCI.Scanner.WebApi` project folder, so it runs from a
  checkout of this repository, not from the published folder. Give it the production connection
  string for that one run through the environment variable `ConnectionStrings__DefaultConnection`,
  from a machine that can reach the production SQL Server.
- **Write access to `logs\`** in the directory the API is started from, for the daily log files
  (`scanner-<date>.log`, seven days kept).

## Check after deploying

- `GET /api/info/version` answers 200 with the version.
- The site root shows the login page, and a page refresh on a deep link (for example `/account`)
  still loads the application.
- The startup log says `Secrets file ../secrets/appsettings.secrets.json loaded`.

# Deployment

Scanner runs as **one IIS site, `scanner.vmci.be`**, on the same Plesk hosting as VMCI, LevelUp and
eLogger (Web Deploy on `vmci.be:8172`; decided 03/10/2026). This setup is copied from LevelUp's,
which already runs there. The site root holds the ASP.NET Core API. `wwwroot/` holds the built PWA,
which the API serves: everything outside `/api/...` goes to `index.html` through the SPA fallback in
`Program.cs`.

HTTPS is mandatory: the camera, the `Secure` login cookie and PWA installation all need it.

The two halves are deployed **separately**:

| Half | Tool | Goes to |
|---|---|---|
| API | Visual Studio publish profile `backend/VMCI.Scanner.WebApi/Properties/PublishProfiles/scanner.vmci.be.pubxml` | site root |
| PWA | `frontend/VMCI.Scanner.App/deploy.ps1` (`npm run deploy`) | `wwwroot/` |

Neither deploy touches the other half: the publish profile skips `wwwroot/`, `secrets/`, `logs/` and
the Let's Encrypt challenge folder, and the frontend script syncs only `wwwroot/`. **After an API
change that the PWA depends on, or the other way round, deploy both.**

Neither the profile nor the script stores a password. Both ask for the Plesk Web Deploy credentials.

## 0. Once: set up the site in Plesk (done 03/10/2026; database `cverhoest_scanner`)

1. Create the site **`scanner.vmci.be`** (subdomain of `vmci.be`), with the .NET 10 Hosting Bundle as
   for LevelUp.
2. Issue a **Let's Encrypt** certificate for it and turn on the redirect from HTTP to HTTPS.
3. Create a **SQL Server database** for it and a database user. Note the database name here once it
   exists; its connection string goes in the secrets file (§3), never in this document.
4. Make sure the site's **Web Deploy** publishing is enabled (as for LevelUp).

## Prerequisites on the developer machine

- **Web Deploy V3** (`msdeploy.exe`): <https://www.iis.net/downloads/microsoft/web-deploy>. Visual
  Studio brings it along; the frontend script needs it too.
- Node and the .NET 10 SDK, as for development.

## 1. Deploy the API (Visual Studio)

1. Right-click `VMCI.Scanner.WebApi` → **Publish** → profile **scanner.vmci.be**.
2. **Publish**. Visual Studio asks for the username and password. If you tick "Save password", it is
   stored DPAPI-encrypted in `scanner.vmci.be.pubxml.user`, per machine. That file is gitignored
   (`*.user`).
3. The browser opens `https://scanner.vmci.be/api/info/version`.

The profile publishes framework-dependent (`processPath="dotnet"`). `app_offline.htm` is placed during
the sync, so the DLLs are not locked.

## 2. Deploy the PWA

```powershell
Set-Location .\frontend\VMCI.Scanner.App
npm run deploy                 # builds, then syncs dist/ to scanner.vmci.be/wwwroot
./deploy.ps1 -SkipBuild        # sync the existing dist/ without building
```

Credentials come from `$env:DEPLOY_USERNAME` / `$env:DEPLOY_PASSWORD` or are asked for (the password
without echo). `$env:DEPLOY_SERVER` and `$env:DEPLOY_SITE` (or `-Server` / `-SiteName`) override
`vmci.be` / `scanner.vmci.be`. Files in `wwwroot/` that are no longer in `dist/` are removed.

The build contains the ~10 MB OpenCV worker (`assets/cv.worker-*.js`). It is not in the PWA precache;
a phone downloads it the first time the scanner opens and caches it then.

## 3. Configuration on the server

- **`appsettings.Production.json`** (committed, published with the API) holds only non-secret values:
  `Frontend:BaseUrl` = `https://scanner.vmci.be`. `web.config` sets `ASPNETCORE_ENVIRONMENT=Production`,
  which is what loads it.
- **All credentials** — the connection string `ConnectionStrings:DefaultConnection` and
  `DocumentIntelligence:Key` (with `DocumentIntelligence:Endpoint`) — are **never committed**. They
  live in `backend/secrets/appsettings.secrets.Production.json` on the developer machine, next to the
  development file `appsettings.secrets.json`. The API reads `appsettings.secrets.json` and then
  `appsettings.secrets.{Environment}.json` from the first `secrets` folder that exists: `../secrets`
  (above the content root, the layout on a development machine), else `./secrets` (inside the site
  root). A development machine runs as Development, so it never reads the Production file.

  ```json
  {
    "ConnectionStrings": { "DefaultConnection": "<the Plesk database's connection string>" },
    "DocumentIntelligence": { "Endpoint": "https://<resource>.cognitiveservices.azure.com/", "Key": "<key>" },
    "Email": { "CertificatePassword": "<password of scanner-mail.pfx>" }
  }
  ```

  - Upload `appsettings.secrets.Production.json` once, **under the same name**, through the Plesk file
    manager to a folder **`secrets` in the site root, next to `wwwroot`**. The application pool cannot
    read above the site root. The server needs no `appsettings.secrets.json`.
  - The file is read only at startup. **After uploading or changing it, restart the app**: recycle
    the application pool in Plesk, or save `web.config` unchanged. After a failed start IIS keeps
    answering HTTP 500.30 until the next restart, even once the cause is gone.
  - Nothing overwrites or exposes it: the publish profile skips `secrets\`, `web.config` hides the
    segment `secrets` from every request (`requestFiltering`), and the project never publishes a
    `secrets` folder of its own.
  - Document Intelligence is the Foundry resource **VMCI-Foundry** (Sweden Central, kind
    AIServices): its endpoint and KEY 1 from *Resource Management → Keys and Endpoint*. The
    `services.ai.azure.com` and `cognitiveservices.azure.com` endpoints both work.
  - **Mail** needs, besides `Email:CertificatePassword` in that file, the certificate itself:
    upload `backend/secrets/scanner-mail.pfx` to the same `secrets` folder. The other `Email` values
    are in the committed `appsettings.json`. Tenant setup and certificate renewal: `docs/mail-setup.md`.
  - Without the connection string the API starts, but every endpoint that touches the database
    answers 500 (including login). Without the Document Intelligence settings the site runs and
    makes image-only PDFs.
- **The Data Protection keys** (they encrypt the login cookie) are written by the API itself to
  **`secrets\data-protection-keys\`** in the site root on first start. The application pool must be
  able to write there — it can, as it writes `logs\` in the same root. **They must never be deleted**:
  without them every user is signed out on every device. The publish profile's skip rule for
  `secrets\` protects them; do not deploy by wiping the site folder.

  ```
  <site root>\           ← the API (VMCI.Scanner.WebApi.dll, web.config)
  ├── wwwroot\           ← the PWA
  ├── logs\              ← scanner-<date>.log
  ├── .well-known\       ← web.config so Let's Encrypt renewals work
  └── secrets\
      ├── appsettings.secrets.Production.json   ← uploaded by hand
      ├── scanner-mail.pfx                      ← uploaded by hand (mail)
      └── data-protection-keys\                 ← written by the API
  ```

  The startup log (`logs\scanner-<date>.log` in the site root) says
  `Secrets files loaded: <path>\secrets\appsettings.secrets.Production.json`, names the Data
  Protection keys folder, and says `Document Intelligence registered` or `skipped`, and `Email
  registered` (with the certificate thumbprint and expiry date) or `Email skipped: …`. If the API does
  not start, set `stdoutLogEnabled="true"` in the server's `web.config` and read `logs\stdout_*.log`.
- **Request size**: a 20-page document is up to about 32 MB. Kestrel and IIS in-process take their
  limit from `Limits` in `appsettings.json`; `web.config` raises IIS's own `maxAllowedContentLength`
  to 33,554,432 bytes to match. Change both together.
- **`.well-known/web.config`** (published with the API into the site root) makes IIS serve
  `/.well-known/...` from disk instead of through the API, so Plesk's Let's Encrypt renewal keeps
  working.

## 4. The database

- The scripts in `docs/sql/` run against the Plesk database **connected to it** (`sqlcmd -d
  <database> -f 65001`, or the database list in SSMS), in date order. Only
  `2026-10-02-initial-schema.sql` names a database: on the server, run it **from the `AccountRole`
  part onward**, skipping its `CREATE DATABASE` / `USE` block, which is for the local
  `cverhoest_scanner`. Later scripts have no `USE`.
- The first administrator is created from a development checkout. With `--environment Production`,
  `VMCI.Scanner.DevTools` reads `backend/secrets/appsettings.secrets.Production.json` and so reaches
  the server's database:

  ```powershell
  dotnet run --project .\backend\VMCI.Scanner.DevTools -- create-account --email <e> --first-name <f> --surname <s> --role ADMIN --environment Production --confirm-production
  ```

  The password is asked twice at a prompt without echo. Everyone else is then created by that
  administrator in the application (Accounts), with a temporary password.

  The connection string in the Production secrets file names the SQL Server as the web server sees
  it (`ASPHOST827\...`), which a development machine cannot resolve. Override it for the one run
  with `$env:ConnectionStrings__DefaultConnection`, using the public address `85.17.54.47,784`, and
  remove the variable afterwards.
- **Copy production to the local database**: `./scripts/restore-prod-to-local.ps1` (the server
  defaults to the Plesk host's public address `85.17.54.47,784`; `-Server` overrides it). Shared
  hosting allows no downloadable `.bak`, and the database user lacks VIEW DEFINITION, so no `.bacpac`
  either. The script therefore needs only SELECT: it builds an empty copy of the **local** schema,
  checks each production table's columns against it (any difference stops the run), copies the
  rows, and only then replaces the local database. It leaves a copy-only
  `cverhoest_scanner_prod_<timestamp>.bak` in the local instance's backup folder. That file holds
  production data: never put it in the repository.

## 5. Check after deploying

- `GET https://scanner.vmci.be/api/info/version` answers the version (anonymous).
- The login page loads, and logging in with the administrator works.
- A deep link such as `https://scanner.vmci.be/admin/accounts`, opened directly, loads the app.
- The startup log shows the secrets line, the Data Protection keys folder and the Document
  Intelligence line from §3.
- **Recycle the application pool once and reload a signed-in page: it must still be signed in.**
  That proves the Data Protection keys persist.
- On a phone: open the site, scan a page, make a PDF, share it. Install the PWA ("Zet op
  beginscherm") and check that it is still signed in after a few days.

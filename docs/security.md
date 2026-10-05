# Security

## Authentication

Decided 03/10/2026 (see `docs/scan-app-plan.md`, section 0): users are invited personally, sign in
once per device, and then stay signed in.

- **Accounts are created by an administrator** in the application (Accounts screen), with a simple
  temporary password the administrator hands over in person. Invitations happen outside the
  system; the application sends no mail for them. The very first administrator is created with
  `VMCI.Scanner.DevTools create-account`, which prompts for the password without echo and refuses a
  non-Development environment unless `--confirm-production` is passed. Nobody pastes a hash into SQL.
- **Login** is `POST /api/auth/login` with an email and a password. On success the API sets the
  login cookie; the frontend never sees or stores a token.
- **First login**: an account created (or reset) by an administrator has
  `Account.MustChangePassword = 1`. Until the user has chosen an own password, every endpoint except
  `auth/me`, `auth/logout`, `auth/login` and `account/me/change-password` answers 403 with code
  `PASSWORD_CHANGE_REQUIRED` (`PasswordChangeRequiredFilter`), and the client shows only the
  password form.
- **Forgotten password**: no self-service reset. An administrator sets a new temporary password.
- **Passwords** are stored only as BCrypt hashes (work factor 12) in `Account.PasswordHash`. A user's
  own password must be at least 8 characters with an uppercase letter, a lowercase letter and a
  digit, and differ from the current one. A temporary password set by an administrator is held
  only to a minimum of 4 characters. An account without a hash cannot sign in.
- **A failed login always answers the same generic 401**, whatever the reason: unknown email, locked
  account, no password set, or wrong password. The response does not reveal whether an email is
  registered.
- **Brute force**: at most `Limits:LoginAttemptsPer15Minutes` (10) login attempts per IP address per
  15 minutes; then 429.
- **Administrator** means `AccountRole.Code = 'ADMIN'`. A caller cannot change their own role: the
  profile request has no role field, and an administrator cannot take away their own administrator
  role or lock their own account.
- **Anonymous endpoints** (`api/info/*`, `api/auth/login`, `api/auth/logout`) return no diagnostic
  detail. See the rule at the top of `InfoController`.

### The login cookie

- `scanner_auth`: `HttpOnly`, `Secure`, `SameSite=Strict`, persistent, sliding, 400 days — the
  longest browsers accept. An active user therefore never signs in again on that device. Logging
  off removes it.
- Its contents (account id, email, `IsAdmin`, `MustChangePassword`, `SecurityStamp`) are encrypted
  by ASP.NET Core Data Protection.
- **Every request re-checks the database** (`AccountSessionValidator`): the account must exist, not
  be locked, have a password, and its `Account.SecurityStamp` must equal the one in the cookie.
  Otherwise the cookie is rejected and removed. A new stamp is written when an administrator locks
  the account or resets its password, and when the user changes their own password — so those take
  effect on every device at its next request (the user's own device gets a fresh cookie).
- Role and `MustChangePassword` are refreshed from the database on every request, so an
  administrator's change applies without a new login.
- **API calls never redirect**: an unauthenticated call gets 401, a forbidden one 403.
- **CSRF**: `SameSite=Strict`, plus `OriginCheckMiddleware`: a state-changing `/api` request whose
  `Origin` header is neither the site itself nor an allowed origin (the Vite dev server in
  Development, `Frontend:BaseUrl` otherwise) is refused with 403.
- **Data Protection keys must survive restarts and deployments**, or every restart signs out every
  device. They are kept in `DataProtection:KeysPath`, by default `data-protection-keys` inside the
  secrets folder: `backend/secrets/` on a development machine, `<site root>/secrets/` on the Plesk
  host (hidden from HTTP by `web.config`, skipped by the publish profile; see `docs/deployment.md`).
  Whoever can read them can forge a login cookie: protect the folder like the secrets file.

## Documents

- The server keeps no documents: a PDF is built, returned and forgotten. Document contents are
  never logged; only page counts, sizes and outcomes.
- Uploaded pages are checked by their magic bytes (JPEG or PNG), page count (`Limits:MaxPages`)
  and size (`Limits:MaxPageBytes`). The request body is capped at all pages plus 1 MB.
- OCR runs at Azure Document Intelligence; the analysis result is deleted there right after it is
  fetched.
- Email only ever goes to an address on the account's own recipient list; adding one is an explicit,
  logged step, removing one is for an administrator only. It is sent from `noreply@vmci.be` through
  Microsoft Graph, app-only with a certificate. The app may send as, and read/write, that one shared
  mailbox and no other: Exchange RBAC role assignments scoped to it, and **no** Graph permission in
  Entra ID (which would be tenant-wide). Proven both ways with `Test-ServicePrincipalAuthorization`;
  see `docs/mail-setup.md`.

## Where secrets live

| Secret | Where | In git |
|---|---|---|
| Data Protection keys (sign and encrypt the login cookie) | `data-protection-keys/` in the secrets folder, or `DataProtection:KeysPath` | no |
| `DocumentIntelligence:Key` (Azure OCR) | `backend/secrets/appsettings.secrets.json` (development), `appsettings.secrets.Production.json` (server) | no |
| `Email:CertificatePassword` and `scanner-mail.pfx` (mail through Graph) | `backend/secrets/` (both secrets files), uploaded by hand to `<site root>/secrets/` on the Plesk host | no |
| Certificates (`*.pfx`, `*.pem`) | `backend/secrets/`, or next to `vite.config.ts` for the mkcert dev certificates | no |
| Development connection string | `appsettings.Development.json` — Windows authentication on `localhost`, no password | yes (not a secret) |
| Production connection string | `backend/secrets/appsettings.secrets.Production.json`, uploaded by hand to `<site root>/secrets/` on the Plesk host | no |

`backend/secrets/` is gitignored as a whole. The API loads `appsettings.secrets.json` and then
`appsettings.secrets.{Environment}.json` from the first secrets folder that exists — `../secrets`
above the content root (development), else `./secrets` inside it (the Plesk host, whose application
pool cannot read above the site root). They come after the `appsettings*.json` files and before
user secrets and environment variables, so a value there beats the committed files, and an
environment variable (for example `DocumentIntelligence__Key`) beats it. A development machine runs
as Development, so it can hold the Production file without ever reading it.

The folder does not travel with git: every development machine and every server needs its own copy,
transferred by hand — never through git and never through a chat. The Data Protection keys need not
be copied between development machines: each machine makes its own on first start, and a login
cookie is per browser anyway.

The secrets file has the same shape as `appsettings.json`:

```json
{
  "DocumentIntelligence": {
    "Key": "<Azure Document Intelligence key>"
  }
}
```

## Decisions

- **03/10/2026 — Cookie login replaces JWT.** Users stay signed in per device (persistent sliding
  cookie, revocable through `SecurityStamp`). `Jwt:Key` is no longer used; an existing
  `Jwt` section in a secrets file is ignored and can be removed.
- **02/10/2026 — Secrets are not committed.** They live in `backend/secrets/`.

## 🟡 Open decision for the user

**May any real secret sit in the committed `appsettings.json`?**

The application this skeleton is modelled on chose yes, for its hosting. That is not assumed here.
Until this is decided the rule is: **nothing secret in any committed file.**

It will come up for the first time with the production connection string, and again with every
integration that needs a key. The options:

1. **Never** — every secret goes in `backend/secrets/` or in environment variables on the server.
   This is the current practice.
2. **Yes, for specific values** — list here exactly which ones, and why the hosting makes that
   acceptable. Keys in a format GitHub's secret scanning recognises still go in `backend/secrets/`,
   because GitHub can block the push or have the key revoked.

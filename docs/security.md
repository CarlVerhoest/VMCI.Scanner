# Security

## Authentication

- **Login** is `POST /api/auth/login` with an email and a password. On success the API returns a
  JWT bearer token; the frontend keeps it in `localStorage` (`scanner_token`) and sends it as
  `Authorization: Bearer …` on every call.
- **Tokens** are signed with HMAC-SHA256 using `Jwt:Key`, and carry the account id (`nameid`), the
  email (`unique_name`) and an `IsAdmin` claim. They expire after `Jwt:ExpirationHours` (24 by
  default). Issuer, audience, lifetime and signature are all validated on every request.
- **Passwords** are stored only as BCrypt hashes (work factor 12) in `Account.PasswordHash`. A new
  password must be at least 8 characters with an uppercase letter, a lowercase letter and a digit.
  An account without a hash cannot sign in.
- **A failed login always answers the same generic 401**, whatever the reason: unknown email, locked
  account, no password set, or wrong password. The response does not reveal whether an email is
  registered.
- **Administrator** means `AccountRole.Code = 'ADMIN'`. A caller cannot change their own role: the
  profile request has no role field.
- **Accounts are created** with `VMCI.Scanner.DevTools create-account`, which prompts for the
  password without echo and refuses a non-Development environment unless `--confirm-production` is
  passed. Nobody pastes a hash into SQL.
- **Anonymous endpoints** (`api/info/*`, `api/auth/login`) return no diagnostic detail. See the rule
  at the top of `InfoController`.

## Where secrets live

| Secret | Where | In git |
|---|---|---|
| `Jwt:Key` | `backend/secrets/appsettings.secrets.json` | no |
| Certificates (`*.pfx`, `*.pem`) | `backend/secrets/`, or next to `vite.config.ts` for the mkcert dev certificates | no |
| Development connection string | `appsettings.Development.json` — Windows authentication on `localhost`, no password | yes (not a secret) |
| Production connection string | not decided yet — see the open decision below | no |

`backend/secrets/` is gitignored as a whole. It is loaded after the `appsettings*.json` files and
before user secrets and environment variables, so a value there beats the committed files, and an
environment variable (for example `Jwt__Key`) beats it.

The folder does not travel with git: every development machine and every server needs its own copy,
transferred by hand — never through git and never through a chat.

The file has the same shape as `appsettings.json`:

```json
{
  "Jwt": {
    "Key": "<at least 32 random characters>"
  }
}
```

A new **environment** (for example production) gets its own key, generated there:

```powershell
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(48))
```

A second **development machine** copies the existing file instead, so tokens stay valid when
switching machines.

## Decisions

- **02/10/2026 — `Jwt:Key` is not committed.** It lives in `backend/secrets/appsettings.secrets.json`.
  The committed `appsettings.json` leaves `Jwt:Key` empty, and the API refuses to start without a
  key.

## 🟡 Open decision for the user

**May any real secret sit in the committed `appsettings.json`?**

The application this skeleton is modelled on chose yes, for its hosting. That is not assumed here.
Until this is decided the rule is: **nothing secret in any committed file.**

It will come up for the first time with the production connection string, and again with every
integration that needs a key. The options:

1. **Never** — every secret goes in `backend/secrets/` or in environment variables on the server.
   This is the current practice and fits the `Jwt:Key` decision above.
2. **Yes, for specific values** — list here exactly which ones, and why the hosting makes that
   acceptable. Keys in a format GitHub's secret scanning recognises still go in `backend/secrets/`,
   because GitHub can block the push or have the key revoked.

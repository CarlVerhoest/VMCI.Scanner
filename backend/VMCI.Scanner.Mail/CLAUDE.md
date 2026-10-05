# VMCI.Scanner.Mail

Sends a scanned PDF from the shared mailbox **`noreply@vmci.be`** ("VMCI Scanner") through Microsoft
Graph, app-only, authenticated with a certificate. No database, no HTTP endpoints of its own.

**Tenant setup, every ID, and what was learned doing it: [`docs/mail-setup.md`](../../docs/mail-setup.md).**
Read it before touching permissions, the certificate or the configuration.

## Contains

- `IEmailSender`, `EmailMessage`, `EmailSendException` — the contract `DocumentsController` uses.
- `GraphEmailSender` — plain HTTP against four Graph endpoints; Azure.Identity only supplies the token.
  - Up to 3 MB of PDF: one `POST /users/{mailbox}/sendMail`, attachment inline.
  - Larger: draft (`POST /messages`), `attachments/createUploadSession`, PUT in 3 MB chunks, `/send`.
    The upload URL is pre-authorised and **must not** carry the bearer token. A draft left by a failure
    is deleted.
  - Every mail lands in the mailbox's Sent Items.
- `ScanMail` — subject and body. **English**, by the owner's decision: the one place where text people read
  is not Dutch. It names the staff member and says the address is not monitored.
- `EmailOptions` (section `Email`) and `EmailCertificate.Load`.
- `AddGraphEmailSender` — the DI registration.

## 🚨 Permissions live in Exchange, never in Entra ID

The app registration has **no** API permissions. `Mail.Send` and `Mail.ReadWrite` are Exchange RBAC
roles scoped to `noreply@vmci.be` alone. A Graph application permission added in Entra ID would be
**tenant-wide** and would silently override that scope. If a feature seems to need another permission,
it is a role assignment on the same scope — ask first, and re-run the two-way test in
`docs/mail-setup.md` step 6.

`Mail.ReadWrite` exists only for the upload session of large attachments. Nothing here reads, moves or
deletes mail other than the draft this code created itself.

## Configuration

| Key | Where | Notes |
|---|---|---|
| `TenantId`, `ClientId`, `SenderAddress` | committed `appsettings.json` | Public identifiers |
| `CertificatePath` | committed `appsettings.json` | `scanner-mail.pfx`, **relative to the secrets folder** (`backend/secrets` locally, `<site root>/secrets` on the server) |
| `CertificatePassword` | secrets file only | The one secret |
| `MaxMessageBytes` | committed `appsettings.json` | Larger PDFs get "use Share or Download" |

`Program.cs` registers the sender only when every value is set **and** the certificate loads; otherwise
the startup log says `Email skipped: …` and the endpoint answers 503. When registered it logs the
thumbprint and expiry date, and warns 30 days before the certificate expires.

The certificate is loaded with `EphemeralKeySet`: the IIS application pool has no profile to store a key in.

## Trying it

```powershell
dotnet run --project backend/VMCI.Scanner.DevTools -- send-test-mail --to <address>
```

`--file <pdf>` sends a PDF of your own; above 3 MB it exercises the upload-session path.
`--environment Production` uses the production secrets file.

A **403 right after a permission change** is usually the Exchange permission cache (30 minutes to two
hours). `Test-ServicePrincipalAuthorization` bypasses that cache and shows whether the assignment itself
is right — trust it and wait, rather than changing the configuration.

## Tests

`Tests.Unit/Mail/` fakes Graph at the HTTP level: both paths, chunk ranges, no token on the upload URL,
draft clean-up, error reporting. Integration tests blank `Email:CertificatePassword`, so a developer's
secrets file never makes the test run send mail.

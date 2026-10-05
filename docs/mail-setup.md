# Mail: sending a PDF from `noreply@vmci.be`

How the server mails a PDF, how the Microsoft 365 tenant is configured for it, and where every
piece lives. Written while the setup was done, step by step, so it doubles as the record of what
exists in the tenant. **Nothing in this document is a secret**: IDs and thumbprints are public
identifiers; the private key and its password live only in the secrets folder.

## Decisions (05/10/2026)

| Topic | Decision | Why |
|---|---|---|
| Transport | **Microsoft Graph**, app-only (client credentials) | vmci.be runs on Microsoft 365 (MX `vmci-be.mail.protection.outlook.com`, SPF `-all` with only Exchange Online and Billit). Mail sent from the Plesk server itself would fail SPF. SMTP AUTH with a password is being retired by Microsoft and does not work for a shared mailbox |
| Authentication | **Certificate**, no client secret | No password credential on the app registration; same approach as Claudine |
| Sender | Shared mailbox **`noreply@vmci.be`**, display name **VMCI Scanner** | No licence needed; sign-in blocked |
| Replies | **No Reply-To.** The body says the address is not read; the mailbox has an automatic reply saying the same | Owner's choice: a noreply address |
| Sender in the text | **Yes**: the body names the staff member who scanned and sent the document | Without it the recipient cannot tell who sent the document |
| Language of the mail | **Everything in the mail is English**: subject, body, the sender line and the fixed line at the bottom saying the address is not monitored | Owner's choice (05/10/2026), an explicit exception to the repository rule that text people read is Dutch. The mailbox's automatic reply is English too. The app's own screens stay Dutch |
| Permissions | Exchange **RBAC for Applications**: `Application Mail.Send` **and** `Application Mail.ReadWrite`, both scoped to `noreply@vmci.be` only. **Nothing** under API permissions in Entra ID | `sendMail` carries at most ~3 MB of attachment; a larger PDF needs a draft plus an upload session, which needs `Mail.ReadWrite`. Scoped to an empty mailbox of its own, the risk is small (option A) |

## 🚨 Lessons carried over from Claudine

Claudine (DSAdmin tenant) went through the same setup to read a mailbox. What went wrong there, and
applies here:

1. **Grant in Exchange, never in Entra ID.** A Graph *application* permission consented in Entra ID
   applies to **every mailbox in the tenant**. Entra grants and Exchange RBAC grants are *additive*:
   an Entra `Mail.Send` next to a scoped Exchange role means no scoping at all, while both screens
   look correct. The app registration therefore has **no** API permissions.
2. **Global Administrator is not enough** to create the scoped role assignment. It needs membership
   of the Exchange role group **Organization Management**; otherwise `New-ManagementRoleAssignment`
   fails with "You must be assigned a delegating role assignment…".
3. **The Object ID comes from *Enterprise applications*,** not from *App registrations* — the two
   pages show different values for what looks like the same field.
4. **Test both directions.** `Test-ServicePrincipalAuthorization` must say `InScope = True` for
   `noreply@vmci.be` and `False` for any other mailbox. Only the negative test proves the scope.
5. **Permissions are cached for 30 minutes to 2 hours.** The test cmdlet bypasses the cache and
   reports success before the application does. Wait; do not change the configuration.
6. **Load the certificate with `X509KeyStorageFlags.EphemeralKeySet`.** The IIS application pool on
   Plesk has no user profile to store a private key in.

## Tenant configuration — the record

Filled in as each step is completed.

| Item | Value |
|---|---|
| Tenant ID | `731f7ac2-3189-44d3-b1df-bf5bd3405cfc` (initial domain `vmci.be.co-telenet.be`; Exchange organization `upcbe1135035.onmicrosoft.com`) |
| App registration name | VMCI Scanner Mail — single tenant, no redirect URI, no client secret |
| App registration Object ID | `57c79b47-6b7e-4e1b-8ce7-eec5c7f9c206` — **not** the one Exchange needs |
| Application (client) ID | `3b079a6f-457a-4e3a-96f7-5fba81168911` |
| Enterprise application Object ID | `29c4bf1d-e387-4c9d-a8f5-e43668f027e6` (from *Enterprise applications*, not *App registrations*) |
| Certificate subject | `CN=VMCI Scanner Mail` |
| Certificate thumbprint | `E30D24D2BBB51D5A1BE5C30D8F8D5695D78A742E` |
| Certificate valid until | **05/10/2031** — renew before this date, see [Certificate renewal](#certificate-renewal) |
| Shared mailbox | `noreply@vmci.be`, display name "VMCI Scanner", alias `noreply` |
| Exchange service principal | display name "VMCI Scanner Mail" |
| Management scope | `VMCI Scanner noreply` — `PrimarySmtpAddress -eq 'noreply@vmci.be'` |
| Role assignments | `VMCI Scanner Mail.Send`, `VMCI Scanner Mail.ReadWrite` |

## Setup steps

| # | Step | Status |
|---|---|---|
| 1 | Check membership of Organization Management; enable organization customization if needed | done 05/10/2026 |
| 2 | Create the certificate (`.cer` + `.pfx` in `backend/secrets/`) | done 05/10/2026 |
| 3 | App registration in Entra ID: upload the `.cer`, remove all API permissions | done 05/10/2026 |
| 4 | Shared mailbox `noreply@vmci.be` with automatic reply; block sign-in | done 05/10/2026 |
| 5 | Exchange: service principal, management scope, two role assignments | done 05/10/2026 |
| 6 | Verify both directions with `Test-ServicePrincipalAuthorization` | done 05/10/2026 |
| 7 | Configuration in the secrets file, development and production | done on the development PC 05/10/2026; server upload with the deployment after step 8 |
| 8 | Code: `VMCI.Scanner.Mail`, DevTools `mail test`, real test mail | not started |

### Step 1 — Exchange module, Organization Management, organization customization

On a machine without it: `Install-Module ExchangeOnlineManagement -Scope CurrentUser` (answer `Y`
to the untrusted-repository prompt: it is Microsoft's own module on PSGallery), then
`Connect-ExchangeOnline -UserPrincipalName <admin>`.

- **Organization Management** in the VMCI tenant has no personal members, only two groups that
  Exchange links to Entra roles: `TenantAdmins_1988214295` (Global Administrators) and
  `ExchangeServiceAdmins_1958018409` (Exchange Administrators). Whoever creates the role
  assignments in step 5 needs one of those two Entra roles. Exchange cannot list their members;
  check in Entra under *Users → the account → Assigned roles*. On 05/10/2026 carl.verhoest@vmci.be
  holds **Global Administrator**, assigned directly (not through PIM).
- **Organization customization** was off (`IsDehydrated : True`) and was enabled on 05/10/2026 with
  `Enable-OrganizationCustomization`; `IsDehydrated` is now `False`. One-way, changes no existing
  permission, and only ever needed once per tenant.

### Step 2 — Certificate

Self-signed, created on 05/10/2026 on the development PC, **valid for five years** (owner's choice:
less maintenance; acceptable because the role it unlocks is narrow).

```powershell
$cert = New-SelfSignedCertificate -Subject "CN=VMCI Scanner Mail" -CertStoreLocation Cert:\CurrentUser\My -KeyExportPolicy Exportable -KeySpec Signature -KeyLength 2048 -HashAlgorithm SHA256 -NotAfter (Get-Date).AddYears(5)
Export-Certificate -Cert $cert -FilePath .\backend\secrets\scanner-mail.cer
Export-PfxCertificate -Cert $cert -FilePath .\backend\secrets\scanner-mail.pfx -Password (Read-Host -AsSecureString "PFX-wachtwoord")
Remove-Item $cert.PSPath
```

| File | What it is | Where it goes |
|---|---|---|
| `backend/secrets/scanner-mail.cer` | Public key only | Uploaded to the app registration (step 3). Not sensitive, but kept beside the `.pfx` |
| `backend/secrets/scanner-mail.pfx` | Private key, password-protected | The API loads it. Copied by hand to every machine that sends mail: other development PCs and `<site root>/secrets/` on the Plesk host |

- The certificate was **removed from the Windows certificate store** after export; the `.pfx` is the
  only copy. It and its password are also kept in the owner's password manager.
- `backend/secrets/` is gitignored as a whole; both files were checked with `git check-ignore`.
- The password is never written in this document or in any committed file; it goes into the secrets
  file in step 7.

### Step 3 — App registration in Entra ID

*entra.microsoft.com → Identity → Applications → App registrations → New registration*: name
`VMCI Scanner Mail`, **single tenant** (the option reads *Single tenant only - vmci.be.co-telenet.be*,
the tenant's initial domain), redirect URI left empty. IDs are in the record table above.

- **Certificates & secrets → Certificates:** `scanner-mail.cer` uploaded, description
  `VMCI Scanner Mail 2031`. **No client secret.**
- **API permissions: empty.** The default delegated `User.Read` was removed. Nothing is added here
  and admin consent is never granted — see lesson 1 above. If a Graph permission ever appears on
  this list, the Exchange scope no longer limits anything: remove it and revoke consent.
- **The Object ID Exchange needs is on the Enterprise application**, reached from the registration's
  Overview through the link *Managed application in local directory* (or *Enterprise applications*,
  with the filter set to *All applications*). The registration's own Object ID is a different value.

### Step 4 — Shared mailbox

```powershell
New-Mailbox -Shared -Name "VMCI Scanner" -DisplayName "VMCI Scanner" -Alias noreply -PrimarySmtpAddress noreply@vmci.be
$text = "This VMCI Scanner address is not monitored. If you have a question about the document you received, please contact the staff member named in the original email directly."
Set-MailboxAutoReplyConfiguration -Identity noreply@vmci.be -AutoReplyState Enabled -ExternalAudience All -InternalMessage $text -ExternalMessage $text
```

- Verified: `RecipientTypeDetails : SharedMailbox`, `AutoReplyState : Enabled`, `ExternalAudience : All`.
- The **automatic reply is English** (owner's choice). It answers anyone who replies to a scanner
  mail anyway.
- **Sign-in is blocked:** the Entra user *VMCI Scanner* was created with *Account enabled* already
  off — Exchange now creates shared-mailbox accounts that way. Leave it off; sending goes through the
  app, never through this account.
- No licence: a shared mailbox up to 50 GB needs none. Every mail the app sends is kept in its
  *Sent Items*, PDF included.

### Step 5 — Exchange: service principal, scope, role assignments

```powershell
New-ServicePrincipal -AppId 3b079a6f-457a-4e3a-96f7-5fba81168911 -ObjectId 29c4bf1d-e387-4c9d-a8f5-e43668f027e6 -DisplayName "VMCI Scanner Mail"
New-ManagementScope -Name "VMCI Scanner noreply" -RecipientRestrictionFilter "PrimarySmtpAddress -eq 'noreply@vmci.be'"
New-ManagementRoleAssignment -Name "VMCI Scanner Mail.Send" -App 29c4bf1d-e387-4c9d-a8f5-e43668f027e6 -Role "Application Mail.Send" -CustomResourceScope "VMCI Scanner noreply"
New-ManagementRoleAssignment -Name "VMCI Scanner Mail.ReadWrite" -App 29c4bf1d-e387-4c9d-a8f5-e43668f027e6 -Role "Application Mail.ReadWrite" -CustomResourceScope "VMCI Scanner noreply"
Get-ManagementRoleAssignment -RoleAssignee 29c4bf1d-e387-4c9d-a8f5-e43668f027e6 | Format-Table Name, Role, CustomResourceScope
```

The service principal and the scope were created without trouble. **The first role assignment was
refused** with *"You must be assigned a delegating role assignment to the management role or its
parent in the hierarchy without a scope restriction"* — the same message Claudine met, but not the
same cause. What was checked on 05/10/2026, and was all correct:

- `Application Mail.Send-Organization Management-Delegating` exists: `Enabled : True`,
  `DelegatingOrgWide`, `RecipientWriteScope : Organization`, no custom scope.
- `Get-ManagementRoleAssignment -Role "Application Mail.Send" -Delegating $true -GetEffectiveUsers`
  lists `carl.verhoest`, through `TenantAdmins_1988214295` and as a direct member.
- carl.verhoest@vmci.be was added to Organization Management directly
  (`Add-RoleGroupMember … -BypassSecurityGroupManagerCheck`; the group is its own `ManagedBy`).
  Reconnecting did not help.

Conclusion: the configuration is right and the change has not propagated yet — almost certainly
because `Enable-OrganizationCustomization` ran the same morning. **On a tenant where organization
customization still has to be enabled, enable it and wait (at least an hour) before creating
role assignments.**

**Resolved the same day:** after waiting, a new session created both assignments without any further
change. `Get-ManagementRoleAssignment -RoleAssignee 29c4bf1d-…` lists `VMCI Scanner Mail.Send`
(`Application Mail.Send`) and `VMCI Scanner Mail.ReadWrite` (`Application Mail.ReadWrite`), both with
`CustomResourceScope : VMCI Scanner noreply`.

carl.verhoest@vmci.be remains a direct member of Organization Management. That adds nothing a Global
Administrator does not already have; certificate renewal does not need it.

### Step 6 — Verify both directions

```powershell
Test-ServicePrincipalAuthorization -Identity 3b079a6f-457a-4e3a-96f7-5fba81168911 -Resource noreply@vmci.be | Format-Table RoleName, GrantedPermissions, AllowedResourceScope, InScope
Test-ServicePrincipalAuthorization -Identity 3b079a6f-457a-4e3a-96f7-5fba81168911 -Resource carl.verhoest@vmci.be | Format-Table RoleName, GrantedPermissions, AllowedResourceScope, InScope
```

05/10/2026: both roles `InScope : True` for `noreply@vmci.be` and `InScope : False` for
`carl.verhoest@vmci.be`. Run the pair again after any change to the scope or the assignments, and
whenever a Graph permission might have been added in Entra ID (the test does not see those — check
*API permissions* is still empty).

### Step 7 — Configuration

The `Email` section of `backend/VMCI.Scanner.WebApi/appsettings.json` (committed) holds the public
values: `TenantId`, `ClientId`, `SenderAddress` and `CertificatePath` (`scanner-mail.pfx`,
**relative to the secrets folder**). Only the password is secret:

| Where | File | What goes in it |
|---|---|---|
| Development PC | `backend/secrets/appsettings.secrets.json` | `"Email": { "CertificatePassword": "…" }`, plus `scanner-mail.pfx` in the same folder |
| Development PC, production copy | `backend/secrets/appsettings.secrets.Production.json` | The same `Email:CertificatePassword` — the file that is uploaded to the server |
| Plesk host | `<site root>/secrets/appsettings.secrets.Production.json` and `<site root>/secrets/scanner-mail.pfx` | Uploaded by hand through the Plesk file manager, as in `docs/deployment.md` |

Without `CertificatePassword` the mail service is not registered and the API starts normally: the
email endpoint answers 503 and the app hides *Mailen naar...*.

- **A `"` or `\` in the password** is escaped in JSON as `\"` and `\\`.
- 05/10/2026: both secrets files on the development PC hold `Email:CertificatePassword`; both parse,
  and the password opens `scanner-mail.pfx` (private key present, thumbprint `E30D24D2…`). The server
  copy is uploaded together with the deployment of step 8.

## Certificate renewal

The current certificate (thumbprint `E30D24D2BBB51D5A1BE5C30D8F8D5695D78A742E`) expires on
**05/10/2031**. When it expires, Graph refuses the token and every mail fails. Renew a few weeks
before:

1. Create a new certificate exactly as in step 2, under a new file name (for example
   `scanner-mail-2031.pfx`), so the old one keeps working meanwhile.
2. Upload the new `.cer` to the same app registration (*Certificates & secrets → Certificates*).
   An app registration accepts several certificates at once; nothing in Exchange changes — the role
   assignments belong to the app, not to the certificate.
3. Point `Email:CertificatePath` and `Email:CertificatePassword` at the new file in the secrets file
   on every machine and on the server; restart the application pool.
4. Send a test mail, then delete the old certificate from the app registration and update the
   thumbprint and date in this document.

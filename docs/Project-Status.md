# Project status

One table per feature domain: status and next action. Update it in the same commit as the work that
changes a status. The build plan is `docs/scan-app-plan.md`; its section 0 lists where the owner
changed it.

Statuses: **done**, **in progress**, **not started**.

## Foundation

| Feature | Status | Next action |
|---|---|---|
| Repository, Claude Code setup, multi-machine memory | done | — |
| Database: `Account`, `AccountRole`, `Recipient` | done | — |
| Backend skeleton (API, DevTools, tests) | done | — |
| Frontend skeleton (account, settings) | done | — |
| Brand: colours, typeface, logo | done | — |

## Login and account

| Feature | Status | Next action |
|---|---|---|
| Cookie login, stays signed in per device (Data Protection, `SecurityStamp`) | done | Confirm on an installed iOS PWA that the cookie survives weeks without use |
| Forced own password at first login and after a reset | done | — |
| Own profile and change password | done | — |
| Account management in the application (admin): create, edit, temporary password, lock | done | — |
| First administrator (`VMCI.Scanner.DevTools create-account`) | done | — |

## Scanning and sharing

| Feature | Status | Next action |
|---|---|---|
| Scanner module (`src/scanner/`): capture, detection, corner editor, warp, page list | done | Plan phase 1 "done when": test on a real iPhone and Android phone with photographed A4 pages (needs HTTPS on the dev server, see README) |
| PDF from pages (PDFsharp) | done | — |
| Searchable PDF (Azure Document Intelligence) | in progress | Code done, never run against Azure: provision the resource (S0, West Europe) and put `DocumentIntelligence:Endpoint`/`Key` in the secrets file |
| Result screen: Share, Download | done | Verify Web Share with files on each target browser |
| Recipients: user adds, admin removes | done | — |
| Email a PDF from the server | not started | Mail service postponed; the endpoint answers 503 and the client hides the option until an `IEmailSender` is registered |
| Polish (plan phase 5): document filter, page reordering, live camera preview, draft across reloads | not started | Optional |

## Operations

| Feature | Status | Next action |
|---|---|---|
| Security decisions | in progress | Open decision in `docs/security.md` |
| Deployment to `scanner.vmci.be` (Plesk) | live | Site, database, administrator and OCR (Foundry, Sweden Central) set up 03/10/2026. Redeploy the API so the startup lines reach the log file, then run the remaining checks in `docs/deployment.md` §5 (phone, PWA install) |

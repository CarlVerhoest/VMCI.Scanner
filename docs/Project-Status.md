# Project status

One table per feature domain: status and next action. Update it in the same commit as the work that
changes a status.

Statuses: **done**, **in progress**, **not started**.

## Foundation

| Feature | Status | Next action |
|---|---|---|
| Repository, Claude Code setup, multi-machine memory | done | — |
| Database: `Account`, `AccountRole` | done | — |
| Backend skeleton (API, DevTools, tests) | done | — |
| Frontend skeleton (home, account, settings) | done | — |
| Brand: colours, typeface, logo | not started | Design together with the user; the logo is a placeholder and the palette is provisional |

## Login and account

| Feature | Status | Next action |
|---|---|---|
| Login (JWT, BCrypt) | done | — |
| Own profile and change password | done | — |
| Creating accounts (`VMCI.Scanner.DevTools create-account`) | done | — |
| Account management in the application (admin) | not started | Not requested yet |

## Scanning and sharing

| Feature | Status | Next action |
|---|---|---|
| Sharing pdf files made from photos or images | not started | Describe the process in `docs/Domain.md` first, then split this row per feature |

## Operations

| Feature | Status | Next action |
|---|---|---|
| Security decisions | in progress | Open decision in `docs/security.md` |
| Deployment | not started | Hosting target not chosen; see `docs/deployment.md` |

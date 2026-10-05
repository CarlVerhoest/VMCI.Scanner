# VMCI.Scanner — repository-wide instructions

VMCI App for quick sharing of pdf files from photos or images

This repository is developed with Claude Code, on more than one PC. These instructions bind every
session and every subagent.

## Names

The project is **VMCI.Scanner**; the application users see is **Scanner**.

- Solution, projects, folders and namespaces: `VMCI.Scanner.*` (`VMCI.Scanner.DB`, `VMCI.Scanner.WebApi`, …).
- The DbContext is `ScannerContext`.
- Everything lower-case uses `scanner`: the `--scanner-*` CSS variables and `scanner-*` classes, the
  log file, the storage keys, the npm package (`scanner.app`) and the dev servers (`scanner-api`,
  `scanner-dev`).

## Domain knowledge: read `docs/Domain.md` first

[`docs/Domain.md`](docs/Domain.md) is the authoritative description of the business domain VMCI.Scanner
supports. **Every agent working in this repository — including subagents — must read
`docs/Domain.md` before making non-trivial changes**, so that entity names, field semantics and
process steps are used correctly.

### How to use it

- **Read it to understand the domain, not to deduce what to implement.** It is a
  *process/verification* document, not a work order. Do not treat a paragraph in it as a ticket.
- **Implementation instructions come from the user, per step, as the project progresses.** Only
  build what has been explicitly asked for.
- Where the document and the actual code/database disagree, the code and database are the current
  truth; flag the discrepancy rather than silently "fixing" either side.

### 🚨 Open questions (🟡) — stop and ask

The document contains open questions marked 🟡, awaiting answers from the domain expert (bundled in
an appendix). They are **unresolved**.

**When work reaches an area covered by an open 🟡 question, stop and ask the user. Do not proceed on
an assumption, however clearly flagged.** This applies to all of them — the narrow ones as much as
the structural ones.

### 🚨 Editing `Domain.md` — ask permission first

The document is maintained by the user and Claude **together**. **Never edit `docs/Domain.md`
without explicitly asking the user first and getting a yes** — not to record an answer, not to fix
an inconsistency, not to tick off a 🟡 question. Propose the change, then wait.

### Companion documents

`Domain.md` references source documents that the user adds to `docs/Sampledocs/` **as each step
comes up**. If one is needed and not yet present, ask for it rather than inferring its contents.
Real sample documents are gitignored (see `.gitignore`); only files named `Anonymized-*` may be
committed.

## Where things stand: `docs/Project-Status.md`

One table per feature domain: status and next action. Update it in the same commit as the work
that changes a status.

## Working across machines

This repository is worked on from more than one PC. Claude's project memory is therefore tracked in
the repository at `.claude/memory/`, and the directory Claude reads is a junction pointing at it, so
memory is versioned and travels with `git push`. A machine where that junction is missing starts
with no memory and gives no warning.

Read [docs/claude-multi-machine.md](docs/claude-multi-machine.md) before changing anything under
`.claude/`, before assuming a transcript from another session is available, or when setting up a new
machine. Note in particular that the repository must be checked out at the **same absolute path** on
every machine — the memory directory is named after it. `scripts/setup-claude-memory.ps1` makes the
junction.

## Working conventions for Claude

- **Shell:** the developer runs **PowerShell 7 only**. Commands handed to the user are PowerShell,
  in `powershell` code blocks. Repository scripts are `.ps1`. There is no Python on the machines.
- **No per-session git worktrees.** Every session works in the main checkout. Run `git status`
  before starting; an unexpected dirty file means another session is live.
- **Commit only when asked**, and never push unasked.
- **Dev servers** are started from `.claude/launch.json` (`scanner-api`, `scanner-dev`), never from
  a shell.
- **Schema changes** are SQL scripts in `docs/sql/` that the user runs; then re-scaffold (see
  `backend/VMCI.Scanner.DB/CLAUDE.md`). Never EF migrations.
- **Secrets and personal data** never enter the repository: keys GitHub would flag go in
  `backend/secrets/` (gitignored), real documents stay out of git, and test fixtures are fabricated.

## Language

- All documentation, code, comments, identifiers and commit messages are **English**.
- Only end-user-facing UI copy is **Dutch**.
- 🚨 **"UI copy" includes text the application *generates at runtime* for a staff member to
  read** — not just the labels sitting in the frontend. Any remark, warning, validation message or
  review note produced by the backend and shown to staff is **Dutch**, even though it is authored in
  C#.
- The English rule still covers everything the *developer* reads: identifiers, comments, log
  messages and exception messages. Where a value is both — a stored note that staff read — the
  **name** of the field is English and its **content** is Dutch.

## Sub-project guides

Each project has its own `CLAUDE.md` with binding conventions — read the relevant one before
touching that project:

- [backend/ARCHITECTURE.md](backend/ARCHITECTURE.md) — how the backend projects relate
- [backend/VMCI.Scanner.DB/CLAUDE.md](backend/VMCI.Scanner.DB/CLAUDE.md) — database-first scaffolding, repository & unit-of-work pattern
- [backend/VMCI.Scanner.WebApi/CLAUDE.md](backend/VMCI.Scanner.WebApi/CLAUDE.md) — controllers, DTOs, configuration & secrets, cookie authentication
- [backend/VMCI.Scanner.Pdf/CLAUDE.md](backend/VMCI.Scanner.Pdf/CLAUDE.md) — image PDF and OCR
- [backend/VMCI.Scanner.Claude/CLAUDE.md](backend/VMCI.Scanner.Claude/CLAUDE.md) — document name suggestions from the OCR text through the Anthropic API
- [backend/VMCI.Scanner.Mail/CLAUDE.md](backend/VMCI.Scanner.Mail/CLAUDE.md) — mail from noreply@vmci.be through Microsoft Graph (tenant setup: `docs/mail-setup.md`)
- [frontend/VMCI.Scanner.App/CLAUDE.md](frontend/VMCI.Scanner.App/CLAUDE.md) — VMCI components, forms, Dutch copy
- [frontend/VMCI.Scanner.App/src/components/VMCIUIComponents/CLAUDE.md](frontend/VMCI.Scanner.App/src/components/VMCIUIComponents/CLAUDE.md)
- [frontend/VMCI.Scanner.App/src/scanner/README.md](frontend/VMCI.Scanner.App/src/scanner/README.md) — the reusable scanner module and its isolation rules

The build plan is [docs/scan-app-plan.md](docs/scan-app-plan.md). Its **section 0** records where the
owner changed the plan (database instead of an accounts file, password login instead of magic
codes, .NET 10, ...) and wins over the rest of that document.

Add a line here for every new project that gets its own `CLAUDE.md`.

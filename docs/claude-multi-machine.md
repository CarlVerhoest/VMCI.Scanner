# Working with Claude across machines

This repository is worked on from more than one PC, pushing to `origin` before switching. Git
carries the code. It does **not** carry most of what Claude accumulates while working on it, and
the parts it misses are not obvious. This document records what travels, what does not, and what to
do when switching machines.

## The two stores

**In the repository** — travels on `git push` / `git pull`:

| Path | What it is |
|---|---|
| `CLAUDE.md` and every sub-project `CLAUDE.md` | the binding conventions |
| `docs/` | the domain documentation |
| `.claude/settings.json` | the shared permission allowlist, machine-independent |
| `.claude/launch.json` | the dev-server definitions used by the Browser pane |
| `.claude/memory/` | Claude's durable project memory — see below |

**On the machine only** — under `%USERPROFILE%\.claude\`:

| Path | What it is |
|---|---|
| `projects/<path-slug>/*.jsonl` | full transcripts, one per session |
| `projects/<path-slug>/*/` | per-session scratch and task output |
| `.claude/settings.local.json` (in the repo, ignored) | this machine's accumulated permission grants |
| `file-history/`, `plans/`, `tasks/`, `history.jsonl` | edit-undo history, saved plans, background tasks, prompt history |

None of that second group is replicated, and none of it is backed up.

## 🚨 The path slug

The per-project directory is named after the repository's **absolute path**, slugified (every
character that is not a letter or digit becomes `-`):

    C:\DATA\Cave\MyRepos\VMCI.Scanner   ->   C--DATA-Cave-MyRepos-VMCI-Scanner

Memory and transcripts are filed under that name. Check out the repository at a different path on
another machine and Claude looks in a directory that does not exist, finds no memory, and says
nothing about it. It does not fall back and it does not warn.

**Every machine must use `C:\DATA\Cave\MyRepos\VMCI.Scanner`.** It is the cheapest of all the guarantees here and the
easiest to break by accident when setting up a new machine or restoring a backup.

## Why `.claude/memory/` is in the repository

Claude's memory is where the non-obvious project knowledge lives: decisions, the reasons behind
them, traps found the hard way. Almost none of it is derivable from the code.

By default it lives at `%USERPROFILE%\.claude\projects\C--DATA-Cave-MyRepos-VMCI-Scanner\memory\` — one disk, one copy,
one machine. So the directory is **tracked in the repository at `.claude/memory/`**, and the
location Claude reads is a filesystem junction pointing at it. Memory is then versioned, reviewable
in a diff, and synchronised by the same `git push` that already happens before every machine
switch.

### One-time setup, per machine

Run once on each machine, from an ordinary (non-elevated) PowerShell 7. A junction does not need
administrator rights.

```powershell
.\scripts\setup-claude-memory.ps1
```

The script refuses to run when the checkout is not at `C:\DATA\Cave\MyRepos\VMCI.Scanner`, keeps whatever memory the
machine already had as `memory.bak-<date>`, and creates the junction. Verify by checking that a file
written on either side appears on the other, then merge anything useful out of the backup into
`.claude/memory/` and delete it.

### If the junction is missing

Claude still works; it simply starts with no memory of the project and writes new memories into a
plain local directory. The symptom is silence, not an error. If Claude seems not to know something
it clearly used to, check that the junction is there before re-explaining anything.

## Procedure when switching machines

On the machine being left:

1. Commit and push. This carries any memory Claude wrote during the session, because
   `.claude/memory/` is part of the working tree — check `git status` for it.

On the machine being picked up:

2. `git pull`. Code, docs, permissions and memory all arrive together.

## What does NOT travel, and must be set up per machine

- **`backend/secrets/`** — `appsettings.secrets.json` and any certificates. Copy them by hand
  (never through git, never through a chat).
- **The local SQL Server database.** Run the scripts in `docs/sql/` in date order on a new machine.
  Both machines' SQL Server instances should be installed with the same collation, or the scaffolder
  will add and remove a `UseCollation(...)` line on every re-scaffold (harmless, but diff noise).
- **mkcert certificates** for HTTPS on the Vite dev server (`*.pem`, optional).

## What is deliberately not synced

- **Transcripts.** Machine-specific and of no use once a session is finished. If something from a
  conversation matters beyond it, it belongs in memory or in `docs/`.
- **`.claude/settings.local.json`.** It accumulates one-off, path-specific and occasionally
  sensitive grants (a signed JWT has turned up in one). It is gitignored. Permissions worth having on
  every machine belong in the tracked `.claude/settings.json` instead.
- **`.claude/worktrees/`.** Not used in this repository (no per-session worktrees), and ignored.

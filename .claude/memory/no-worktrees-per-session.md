---
name: no-worktrees-per-session
description: Never use per-session git worktrees; all sessions work in the main checkout
metadata:
  type: feedback
---

**No per-session git worktrees in this repository.** Do not propose `EnterWorktree`, do not pass
`isolation: "worktree"` to the Agent tool, do not `git worktree add`.

**Why:** carried over from eTrustee (02/09/2026): leftovers stayed behind and were forgotten — two
abandoned worktrees and three stale branches, one holding an edit that would have re-broken the EF
scaffolding namespaces. The isolation worked; nothing ever came back out of it. The shared dev
database and the scaffold were never protected by worktrees anyway.

**How to apply:** `worktree.bgIsolation` is `"none"` in `.claude/settings.json`. One writing session
at a time, extra sessions read-only, and `git status` before starting — an unexpected dirty file
means another session is live.

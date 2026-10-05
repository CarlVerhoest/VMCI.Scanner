---
name: never-shorten-names
description: The software never truncates or abbreviates a name; a value too long is shown in full and flagged, and the column gives way
metadata:
  type: feedback
---

**The software never shortens, abbreviates or truncates names** — companies, courts, people, anything
a person will read or that ends up in a document or a folder name.

**Why:** carried over from eTrustee (03/09/2026). A silently shortened name is wrong precisely where
nobody re-reads it: in a generated letter, in a folder name that is never renamed. The temptation is
concrete — `nvarchar(50)` columns met real values of 51 characters, and cutting is the easy fix.

**How to apply:** a length limit is a reason to ask a person, never to cut. Show the value in full,
flag it, and widen the **column** (a schema script). Keep the backend limit and the frontend
`maxLength` in one named constant each, changed together. `maxLength` may stop typing; it must never
touch a value that arrived by import.

**Exception, decided by the user 05/10/2026:** the company name in Scanner's *suggested document
name* (`VMCI.Scanner.Claude`) is the short name the company is known by — legal form (NV, BV, ...)
dropped, branch dropped, long names cut to their core. That name is a proposal the user sees and can
edit before sharing, not stored data. The rule still holds everywhere else.

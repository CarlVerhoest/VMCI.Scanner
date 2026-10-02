---
name: docs-language-english
description: All documentation, code and comments are English; only UI copy (including backend-generated text staff read) is Dutch
metadata:
  type: feedback
---

Documentation, `CLAUDE.md` files, code comments, identifiers, log and exception messages and commit
messages are **English**. What an end user reads is **Dutch**: labels, headings, buttons (`Opslaan`,
`Annuleren`), validation and error messages — and also text the backend generates for staff
(remarks, warnings, review notes), even though it is authored in C#.

**Why:** the users are Belgian and Dutch-speaking; the developers read English. Two deliberately
separate concerns.

**How to apply:** see the Language section of the root `CLAUDE.md` and the form patterns in the
frontend `CLAUDE.md`. Related: [[dutch-form-ui-copy]].

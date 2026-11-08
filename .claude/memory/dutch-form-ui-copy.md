---
name: dutch-form-ui-copy
description: Forms follow one pattern — RequiredMark, no "optional" text, Opslaan/Annuleren bottom-right via FormActions
metadata:
  type: project
---

Every create/edit form uses the VMCI library's form components (`@vmci/ui`, since 2026-11-08; before
that `src/components/FormControls.tsx`): `<FormField label required error>` shows the `*` that turns
red on a validation failure, optional fields show nothing at all, and `<FormActions isBusy>` gives the
**Opslaan** (submit) / **Annuleren** buttons.
Required fields mirror the backend DTO's `[Required]` attributes. Details in the frontend
`CLAUDE.md` ("Form Patterns"). Related: [[docs-language-english]].

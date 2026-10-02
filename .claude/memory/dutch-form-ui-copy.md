---
name: dutch-form-ui-copy
description: Forms follow one pattern — RequiredMark, no "optional" text, Opslaan/Annuleren bottom-right via FormActions
metadata:
  type: project
---

Every create/edit form uses `src/components/FormControls.tsx`: `<RequiredMark invalid={...} />` after
a required field's label (the `*` turns red on a validation failure), nothing at all on optional
fields, and `<FormActions>` for the bottom-right **Opslaan** (submit) / **Annuleren** buttons.
Required fields mirror the backend DTO's `[Required]` attributes. Details in the frontend
`CLAUDE.md` ("Form Patterns"). Related: [[docs-language-english]].

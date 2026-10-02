// Shared building blocks for the app's forms. See the "Form Patterns" section in
// frontend/VMCI.Scanner.App/CLAUDE.md for the rules these enforce:
//   - Required fields carry a RequiredMark ('*') next to their label; optional fields carry
//     nothing at all (no marker, and no "Optional" helper text).
//   - The RequiredMark turns red once its field fails validation.
//   - Save/Cancel live in FormActions, bottom-right-aligned.

// Red-turning required-field marker. A mandatory field's <label> renders one of these; optional
// fields render nothing. The asterisk is muted by default and turns red once `invalid` is true
// (i.e. that field failed validation), giving an at-a-glance cue next to the label.
export function RequiredMark({ invalid = false }: { invalid?: boolean }) {
  return (
    <span
      className={`scanner-required-mark${invalid ? ' scanner-required-mark--invalid' : ''}`}
      aria-hidden="true"
    >
      {' '}
      *
    </span>
  )
}

export interface FormActionsProps {
  isSaving: boolean
  onCancel: () => void
  // "This form isn't in a state that may be submitted yet" - e.g. a document review that still
  // has rows to sign off. Deliberately narrower than `isSaving`: it greys out Opslaan only and
  // never Annuleren, since a user must always be able to walk away from a form they cannot
  // complete. Optional, so forms that only know about `isSaving` are unaffected.
  disabled?: boolean
}

// Bottom-right-aligned Opslaan/Annuleren action row shared by every form. `isSaving` disables
// both buttons (and swaps the Save label while a request is in flight). The submit button relies
// on the enclosing <form onSubmit=...>, so this must be rendered inside the form. All captions are
// Dutch, matching the rest of the form copy (see the Form Patterns section in CLAUDE.md). The
// cancel/close button is always labelled "Annuleren" app-wide, and stays clickable unless a save
// is actually in flight.
export function FormActions({ isSaving, onCancel, disabled = false }: FormActionsProps) {
  return (
    <div className="d-flex justify-content-end gap-2 mt-4">
      <button type="submit" className="btn btn-primary" disabled={isSaving || disabled}>
        {isSaving ? 'Bezig met opslaan...' : 'Opslaan'}
      </button>
      <button
        type="button"
        className="btn btn-outline-secondary"
        onClick={onCancel}
        disabled={isSaving}
      >
        Annuleren
      </button>
    </div>
  )
}

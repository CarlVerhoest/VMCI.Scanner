import { ReactNode } from 'react'
import { Modal } from 'react-bootstrap'

export interface ConfirmDialogProps {
  show: boolean
  title: string
  message: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  // 'danger' for destructive actions (the only kind this dialog exists for so far) -
  // 'primary' is available for a future non-destructive confirmation if one shows up.
  variant?: 'danger' | 'primary'
  isConfirming?: boolean
  // Surfaced inside the dialog (rather than the page behind it) so the user sees why their
  // confirmed action failed without the dialog closing out from under them.
  error?: string | null
  onConfirm: () => void
  onCancel: () => void
}

// Generic "are you sure?" dialog for a destructive action - not part of VMCIUIComponents (that
// barrel is specifically the components ported from KAZM.eSoar's UIComponents library, and this
// isn't one of them), but shared the same way FormControls.tsx is. All copy is Dutch, matching
// the rest of the app's user-facing text.
export function ConfirmDialog({
  show,
  title,
  message,
  confirmLabel = 'Bevestigen',
  cancelLabel = 'Annuleren',
  variant = 'danger',
  isConfirming = false,
  error = null,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <Modal show={show} onHide={onCancel} centered>
      <Modal.Header closeButton>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {message}
      </Modal.Body>
      <Modal.Footer>
        <button type="button" className="btn btn-outline-secondary" onClick={onCancel} disabled={isConfirming}>
          {cancelLabel}
        </button>
        <button type="button" className={`btn btn-${variant}`} onClick={onConfirm} disabled={isConfirming}>
          {isConfirming ? 'Bezig...' : confirmLabel}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

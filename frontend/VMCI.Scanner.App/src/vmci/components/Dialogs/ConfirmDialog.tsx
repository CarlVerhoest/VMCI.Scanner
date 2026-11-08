import { useId, type ReactNode } from 'react'
import Modal from 'react-bootstrap/Modal'
import { useLabels } from '../VMCIProvider/vmciContext'
import { dialogsLabels, type DialogsLabels } from './Dialogs.labels'
import './Dialogs.css'

export interface ConfirmDialogProps {
  show: boolean
  title: ReactNode
  /** The question, e.g. "Deze vlucht verwijderen?". */
  message?: ReactNode
  /** Extra content under the message, e.g. a summary of the record. */
  children?: ReactNode
  /** Text of the confirm button (default `labels.confirm`). */
  confirmLabel?: string
  /** `danger` for destructive actions (default), `primary` otherwise. */
  variant?: 'danger' | 'primary'
  /** The confirmed action runs: buttons disabled, dialog cannot be closed. */
  isBusy?: boolean
  /** Shown inside the dialog, so the user sees why the action failed. */
  error?: ReactNode
  onConfirm: () => void
  /** Cancel, the close button or Escape. */
  onHide: () => void
  /** After the closing animation (e.g. to unmount). */
  onExited?: () => void
  /** Overrides the default texts. */
  labels?: Partial<DialogsLabels>
}

/** "Are you sure?" before an action. Focus starts on Cancel for a destructive action. */
export function ConfirmDialog({
  show,
  title,
  message,
  children,
  confirmLabel,
  variant = 'danger',
  isBusy = false,
  error,
  onConfirm,
  onHide,
  onExited,
  labels,
}: ConfirmDialogProps) {
  const text = useLabels('dialogs', dialogsLabels, labels)
  // react-bootstrap does not link the title and message to the dialog: do it here.
  const titleId = useId()
  const messageId = useId()
  const close = () => {
    if (!isBusy) onHide()
  }
  return (
    <Modal
      show={show}
      onHide={close}
      centered
      onExited={onExited}
      backdrop={isBusy ? 'static' : true}
      keyboard={!isBusy}
      className="vmci-dialog"
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
    >
      <Modal.Header closeButton={!isBusy} closeLabel={text.close}>
        <Modal.Title as="h2" className="h5" id={titleId}>
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {error && (
          <div className="alert alert-danger" role="alert">
            {error}
          </div>
        )}
        {message && (
          <div id={messageId} className="vmci-dialog__message">
            {message}
          </div>
        )}
        {children && <div className="vmci-dialog__details">{children}</div>}
      </Modal.Body>
      <Modal.Footer className="vmci-dialog__footer">
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={close}
          disabled={isBusy}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- safe default for destructive actions
          autoFocus={variant === 'danger'}
        >
          {text.cancel}
        </button>
        <button
          type="button"
          className={`btn btn-${variant}`}
          onClick={onConfirm}
          disabled={isBusy}
          aria-busy={isBusy || undefined}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the expected answer for a harmless question
          autoFocus={variant !== 'danger'}
        >
          {isBusy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {isBusy ? text.busy : (confirmLabel ?? text.confirm)}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

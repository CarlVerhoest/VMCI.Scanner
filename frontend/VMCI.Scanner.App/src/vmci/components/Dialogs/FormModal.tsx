import { useId, type FormEvent, type ReactNode } from 'react'
import Modal from 'react-bootstrap/Modal'
import { FormActions } from '../FormActions/FormActions'
import type { FormActionsLabels } from '../FormActions/FormActions.labels'
import { useLabels } from '../VMCIProvider/vmciContext'
import { dialogsLabels } from './Dialogs.labels'
import './Dialogs.css'

export interface FormModalProps {
  show: boolean
  title: ReactNode
  /** The form fields (FormField, inputs, …). */
  children: ReactNode
  /** Submit (Save button or Enter in a field). `preventDefault` is already called. */
  onSubmit: (event: FormEvent<HTMLFormElement>) => void
  /** Cancel, the close button or Escape. */
  onHide: () => void
  /** Saving: buttons disabled, the dialog cannot be closed. */
  isBusy?: boolean
  /** The form may not be submitted yet: disables Save only. */
  submitDisabled?: boolean
  /** A problem with saving, shown above the fields. */
  error?: ReactNode
  /** Extra actions in the footer, e.g. a Delete button. */
  extra?: ReactNode
  size?: 'sm' | 'lg' | 'xl'
  /** Full screen below this breakpoint. Default `sm-down` (phones). `false`: never. */
  fullscreen?: 'sm-down' | 'md-down' | 'lg-down' | false
  saveVariant?: 'primary' | 'danger' | 'success'
  /** Overrides the texts of the footer buttons. */
  labels?: Partial<FormActionsLabels>
}

/**
 * A dialog with a form: title, fields, Save/Cancel. Focus trap, Escape and scrolling come
 * from react-bootstrap's Modal; long forms scroll inside the dialog.
 */
export function FormModal({
  show,
  title,
  children,
  onSubmit,
  onHide,
  isBusy = false,
  submitDisabled = false,
  error,
  extra,
  size,
  fullscreen = 'sm-down',
  saveVariant,
  labels,
}: FormModalProps) {
  const text = useLabels('dialogs', dialogsLabels)
  const titleId = useId()
  const close = () => {
    if (!isBusy) onHide()
  }
  return (
    <Modal
      show={show}
      onHide={close}
      size={size}
      fullscreen={fullscreen === false ? undefined : fullscreen}
      scrollable
      backdrop={isBusy ? 'static' : true}
      keyboard={!isBusy}
      aria-labelledby={titleId}
      className="vmci-dialog vmci-form-modal"
    >
      <form
        noValidate
        onSubmit={(e) => {
          e.preventDefault()
          if (!isBusy && !submitDisabled) onSubmit(e)
        }}
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
          {children}
        </Modal.Body>
        <Modal.Footer className="vmci-form-modal__footer">
          <FormActions
            className="w-100 mt-0"
            isBusy={isBusy}
            disabled={submitDisabled}
            onCancel={close}
            extra={extra}
            saveVariant={saveVariant}
            labels={labels}
          />
        </Modal.Footer>
      </form>
    </Modal>
  )
}

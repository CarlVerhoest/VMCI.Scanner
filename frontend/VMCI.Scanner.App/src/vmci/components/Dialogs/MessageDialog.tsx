import { useId, type ReactNode } from 'react'
import Modal from 'react-bootstrap/Modal'
import {
  faCircleCheck,
  faCircleInfo,
  faCircleXmark,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useLabels } from '../VMCIProvider/vmciContext'
import { dialogsLabels, type DialogsLabels } from './Dialogs.labels'
import './Dialogs.css'

/** `ok` for OK and Yes, `cancel` for Cancel, No, the close button and Escape. */
export type MessageResult = 'ok' | 'cancel'
export type MessageButtons = 'ok' | 'okCancel' | 'yesNo'
export type MessageTone = 'info' | 'success' | 'warning' | 'danger'

export interface MessageDialogProps {
  show: boolean
  title: ReactNode
  message?: ReactNode
  children?: ReactNode
  /** Default `ok`. */
  buttons?: MessageButtons
  /** Icon and colour; none by default. `danger` makes it an alert dialog. */
  tone?: MessageTone
  onHide: (result: MessageResult) => void
  /** After the closing animation (e.g. to unmount). */
  onExited?: () => void
  /** Overrides the default texts. */
  labels?: Partial<DialogsLabels>
}

const TONE_ICON = {
  info: faCircleInfo,
  success: faCircleCheck,
  warning: faTriangleExclamation,
  danger: faCircleXmark,
}

/** A message or a simple question (OK, OK/Cancel, Yes/No). */
export function MessageDialog({
  show,
  title,
  message,
  children,
  buttons = 'ok',
  tone,
  onHide,
  onExited,
  labels,
}: MessageDialogProps) {
  const text = useLabels('dialogs', dialogsLabels, labels)
  // react-bootstrap does not link the title and message to the dialog: do it here.
  const titleId = useId()
  const messageId = useId()
  const [okText, cancelText] =
    buttons === 'yesNo'
      ? [text.yes, text.no]
      : [text.ok, buttons === 'okCancel' ? text.cancel : null]
  return (
    <Modal
      show={show}
      onHide={() => onHide('cancel')}
      centered
      onExited={onExited}
      className="vmci-dialog"
      aria-labelledby={titleId}
      aria-describedby={message ? messageId : undefined}
    >
      <Modal.Header closeButton closeLabel={text.close}>
        <Modal.Title as="h2" className="h5 d-flex align-items-center gap-2" id={titleId}>
          {tone && (
            <FontAwesomeIcon
              icon={TONE_ICON[tone]}
              className={`vmci-dialog__icon vmci-dialog__icon--${tone}`}
              aria-hidden="true"
            />
          )}
          {title}
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {message && (
          <div id={messageId} className="vmci-dialog__message">
            {message}
          </div>
        )}
        {children && <div className="vmci-dialog__details">{children}</div>}
      </Modal.Body>
      <Modal.Footer className="vmci-dialog__footer">
        {cancelText && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={() => onHide('cancel')}
          >
            {cancelText}
          </button>
        )}
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => onHide('ok')}
          // eslint-disable-next-line jsx-a11y/no-autofocus -- the default answer, as in a native dialog
          autoFocus
        >
          {okText}
        </button>
      </Modal.Footer>
    </Modal>
  )
}

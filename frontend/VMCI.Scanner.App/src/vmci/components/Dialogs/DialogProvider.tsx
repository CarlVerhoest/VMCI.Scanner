import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { ConfirmDialog } from './ConfirmDialog'
import {
  DialogContext,
  type ConfirmOptions,
  type DialogApi,
  type MessageOptions,
} from './dialogContext'
import { MessageDialog, type MessageResult } from './MessageDialog'

type Request = { id: number; closing: boolean } & (
  | { kind: 'confirm'; options: ConfirmOptions; resolve: (ok: boolean) => void }
  | { kind: 'message'; options: MessageOptions; resolve: (result: MessageResult) => void }
)

let nextId = 1

/**
 * Makes `useConfirm()` and `useMessage()` work below it. Place it once, near the root of the
 * app (inside VMCIProvider, so the dialogs get the app's texts). Requests are shown one at a time.
 */
export function DialogProvider({ children }: { children?: ReactNode }) {
  const [queue, setQueue] = useState<Request[]>([])
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<ReactNode>(null)
  const current = queue[0]

  // Hide the current dialog; it leaves the queue once its closing animation has finished.
  const close = useCallback(() => {
    setQueue((q) => (q[0] ? [{ ...q[0], closing: true }, ...q.slice(1)] : q))
    setBusy(false)
    setError(null)
  }, [])
  const removeClosed = useCallback(() => setQueue((q) => (q[0]?.closing ? q.slice(1) : q)), [])

  const api = useMemo<DialogApi>(
    () => ({
      confirm: (options) =>
        new Promise<boolean>((resolve) =>
          setQueue((q) => [
            ...q,
            { id: nextId++, closing: false, kind: 'confirm', options, resolve },
          ]),
        ),
      message: (options) =>
        new Promise<MessageResult>((resolve) =>
          setQueue((q) => [
            ...q,
            { id: nextId++, closing: false, kind: 'message', options, resolve },
          ]),
        ),
    }),
    [],
  )

  async function confirmCurrent(request: Extract<Request, { kind: 'confirm' }>) {
    if (request.options.action) {
      setBusy(true)
      setError(null)
      try {
        await request.options.action()
      } catch (e) {
        setBusy(false)
        setError(e instanceof Error ? e.message : String(e))
        return
      }
    }
    request.resolve(true)
    close()
  }

  return (
    <DialogContext.Provider value={api}>
      {children}
      {current?.kind === 'confirm' && (
        <ConfirmDialog
          key={current.id}
          show={!current.closing}
          title={current.options.title}
          message={current.options.message}
          confirmLabel={current.options.confirmLabel}
          variant={current.options.variant}
          isBusy={busy}
          error={error}
          onConfirm={() => void confirmCurrent(current)}
          onHide={() => {
            current.resolve(false)
            close()
          }}
          onExited={removeClosed}
        >
          {current.options.details}
        </ConfirmDialog>
      )}
      {current?.kind === 'message' && (
        <MessageDialog
          key={current.id}
          show={!current.closing}
          title={current.options.title}
          message={current.options.message}
          buttons={current.options.buttons}
          tone={current.options.tone}
          onHide={(result) => {
            current.resolve(result)
            close()
          }}
          onExited={removeClosed}
        >
          {current.options.details}
        </MessageDialog>
      )}
    </DialogContext.Provider>
  )
}

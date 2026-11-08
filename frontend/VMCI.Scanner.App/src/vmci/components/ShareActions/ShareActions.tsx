import { forwardRef, useMemo, useState, type ComponentPropsWithoutRef } from 'react'
import clsx from 'clsx'
import { faDownload, faShareNodes } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useLabels } from '../VMCIProvider/vmciContext'
import { shareActionsLabels, type ShareActionsLabels } from './ShareActions.labels'
import { canShareFile, downloadBlob, shareFile, toFile } from './shareUtils'
import './ShareActions.css'

export interface ShareActionsProps extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onError'
> {
  /** The file to hand over; `null` (not there yet) disables both buttons. */
  file: File | Blob | null
  /** Name of the shared or downloaded file, e.g. `factuur.pdf`. */
  fileName: string
  /** Title for the share sheet. Default: `fileName`. */
  shareTitle?: string
  /** Sharing or downloading failed. Not called when the user closes the share sheet. */
  onError?: (error: unknown) => void
  /** The share sheet completed. */
  onShared?: () => void
  /** The download was started. */
  onDownloaded?: () => void
  /** The file is being prepared: both buttons are disabled and show a spinner. */
  isBusy?: boolean
  disabled?: boolean
  size?: 'sm' | 'lg'
  /** Overrides the default texts. */
  labels?: Partial<ShareActionsLabels>
}

/**
 * "Delen" and "Downloaden" for a file the app holds in memory (e.g. a generated PDF). Where the
 * browser can share files (phones), Share is the primary button and Download the secondary one;
 * elsewhere (e.g. desktop Firefox) only Download is shown, as the primary button.
 */
export const ShareActions = forwardRef<HTMLDivElement, ShareActionsProps>(function ShareActions(
  {
    file,
    fileName,
    shareTitle,
    onError,
    onShared,
    onDownloaded,
    isBusy = false,
    disabled = false,
    size,
    labels,
    className,
    ...rest
  },
  ref,
) {
  const text = useLabels('shareActions', shareActionsLabels, labels)
  const [isSharing, setIsSharing] = useState(false)
  const shareable = useMemo(() => (file ? toFile(file, fileName) : null), [file, fileName])
  const canShare = shareable !== null && canShareFile(shareable)
  const off = disabled || isBusy || shareable === null

  const share = async () => {
    if (!shareable) return
    // Blocks a second tap while the sheet is open: browsers reject an overlapping share().
    setIsSharing(true)
    try {
      if ((await shareFile(shareable, shareTitle ?? fileName)) === 'shared') onShared?.()
    } catch (error) {
      onError?.(error)
    } finally {
      setIsSharing(false)
    }
  }

  const download = () => {
    if (!shareable) return
    try {
      downloadBlob(shareable, fileName)
      onDownloaded?.()
    } catch (error) {
      onError?.(error)
    }
  }

  const button = (variant: string) => clsx('btn', `btn-${variant}`, size && `btn-${size}`)
  const spinner = isBusy && <span className="spinner-border spinner-border-sm" aria-hidden="true" />

  return (
    <div
      ref={ref}
      aria-busy={isBusy || undefined}
      {...rest}
      className={clsx('vmci-share-actions', className)}
    >
      {canShare && (
        <button
          type="button"
          className={button('primary')}
          disabled={off || isSharing}
          onClick={() => void share()}
        >
          {spinner || <FontAwesomeIcon icon={faShareNodes} aria-hidden="true" />}
          {text.share}
        </button>
      )}
      <button
        type="button"
        className={button(canShare ? 'outline-primary' : 'primary')}
        disabled={off}
        onClick={download}
      >
        {spinner || <FontAwesomeIcon icon={faDownload} aria-hidden="true" />}
        {text.download}
      </button>
    </div>
  )
})

import { useEffect, useMemo, useRef, useState, type ChangeEvent, type DragEvent } from 'react'
import { CornerEditor } from './CornerEditor'
import { ScannerEngine } from './engine'
import type { Quad } from './geometry'
import { decodeImage } from './imaging'
import { defaultLabels, type ScannerLabels } from './labels'
import './scanner.css'

/** One finished page: perspective-corrected JPEG. */
export interface ScannedPage {
  blob: Blob
  width: number
  height: number
}

export interface DocumentScannerProps {
  onComplete: (pages: ScannedPage[]) => void
  onCancel: () => void
  maxPages?: number
  labels?: Partial<ScannerLabels>
}

interface PageItem {
  id: number
  /** The original photo, kept so corners can be re-edited; decoding it again is deterministic. */
  file: Blob
  quad: Quad
  /** Detection found nothing and nobody has looked at the fallback corners yet. */
  needsCheck: boolean
  quarterTurns: number
  result: ScannedPage
  thumbnailUrl: string
}

type EditorState = {
  source: HTMLCanvasElement
  quad: Quad
  detectedQuad: Quad | null
  /** Re-editing an existing page, or placing a new photo. */
  page: PageItem | null
  file: Blob
}

let nextPageId = 1

export function DocumentScanner({
  onComplete,
  onCancel,
  maxPages = 20,
  labels: labelOverrides,
}: DocumentScannerProps) {
  const labels = useMemo(() => ({ ...defaultLabels, ...labelOverrides }), [labelOverrides])

  const [engine, setEngine] = useState<ScannerEngine | null>(null)
  const [engineState, setEngineState] = useState<'loading' | 'ready' | 'failed'>('loading')
  const [pages, setPages] = useState<PageItem[]>([])
  const [editor, setEditor] = useState<EditorState | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)

  const cameraInput = useRef<HTMLInputElement>(null)
  const filesInput = useRef<HTMLInputElement>(null)
  const pagesRef = useRef(pages)
  pagesRef.current = pages

  useEffect(() => {
    const instance = new ScannerEngine()
    setEngine(instance)
    setEngineState('loading')
    instance.ready.then(
      () => setEngineState('ready'),
      () => setEngineState('failed')
    )
    return () => instance.dispose()
  }, [])

  // Release the thumbnails' object URLs when the scanner goes away.
  useEffect(() => () => pagesRef.current.forEach((p) => URL.revokeObjectURL(p.thumbnailUrl)), [])

  const run = async (work: () => Promise<void>) => {
    setBusy(true)
    setError(null)
    try {
      await work()
    } catch (e) {
      console.error('Scanner processing failed', e)
      setError(labels.processingFailed)
    } finally {
      setBusy(false)
    }
  }

  const makePage = async (
    file: Blob,
    source: HTMLCanvasElement,
    quad: Quad,
    quarterTurns: number,
    needsCheck: boolean,
    id = nextPageId++
  ): Promise<PageItem> => {
    if (!engine) throw new Error('Scanner not ready')
    const result = await engine.render(source, quad, quarterTurns)
    return {
      id,
      file,
      quad,
      needsCheck,
      quarterTurns,
      result,
      thumbnailUrl: URL.createObjectURL(result.blob),
    }
  }

  const replacePage = (page: PageItem) =>
    setPages((current) =>
      current.map((p) => {
        if (p.id !== page.id) return p
        URL.revokeObjectURL(p.thumbnailUrl)
        return page
      })
    )

  const addFiles = (fileList: FileList | File[]) => {
    const files = Array.from(fileList)
    if (files.length === 0 || !engine) return

    const images = files.filter((f) => f.type.startsWith('image/'))
    if (images.length < files.length) setError(labels.notAnImage)
    const room = maxPages - pages.length
    if (images.length > room) setError(labels.maxPagesReached(maxPages))
    const accepted = images.slice(0, Math.max(room, 0))
    if (accepted.length === 0) return

    void run(async () => {
      // One photo: let the user confirm the corners straight away.
      if (accepted.length === 1) {
        const source = await decodeImage(accepted[0])
        const { quad, detected } = await engine.findCorners(source)
        setEditor({
          source,
          quad,
          detectedQuad: detected ? quad : null,
          page: null,
          file: accepted[0],
        })
        return
      }

      // Several at once: process them all with the detected corners; pages where detection
      // found nothing are flagged so the user checks them.
      for (const file of accepted) {
        const source = await decodeImage(file)
        const { quad, detected } = await engine.findCorners(source)
        const page = await makePage(file, source, quad, 0, !detected)
        setPages((current) => [...current, page])
      }
    })
  }

  const handleInput = (event: ChangeEvent<HTMLInputElement>) => {
    if (event.target.files) addFiles(event.target.files)
    // Allow picking the same file again.
    event.target.value = ''
  }

  const handleDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragOver(false)
    addFiles(event.dataTransfer.files)
  }

  const applyEditor = (quad: Quad) => {
    const state = editor
    if (!state) return
    setEditor(null)
    void run(async () => {
      if (state.page) {
        replacePage(
          await makePage(
            state.file,
            state.source,
            quad,
            state.page.quarterTurns,
            false,
            state.page.id
          )
        )
      } else {
        const page = await makePage(state.file, state.source, quad, 0, false)
        setPages((current) => [...current, page])
      }
    })
  }

  const editPage = (page: PageItem) =>
    void run(async () => {
      const source = await decodeImage(page.file)
      setEditor({ source, quad: page.quad, detectedQuad: null, page, file: page.file })
    })

  const rotatePage = (page: PageItem) =>
    void run(async () => {
      const source = await decodeImage(page.file)
      replacePage(
        await makePage(
          page.file,
          source,
          page.quad,
          (page.quarterTurns + 1) % 4,
          page.needsCheck,
          page.id
        )
      )
    })

  const removePage = (page: PageItem) => {
    URL.revokeObjectURL(page.thumbnailUrl)
    setPages((current) => current.filter((p) => p.id !== page.id))
  }

  const handleCancel = () => {
    if (pages.length > 0 && !window.confirm(labels.confirmCancel)) return
    onCancel()
  }

  if (editor) {
    return (
      <div className="scanner-module">
        <CornerEditor
          source={editor.source}
          initialQuad={editor.quad}
          detectedQuad={editor.detectedQuad}
          labels={labels}
          onApply={applyEditor}
          onCancel={() => setEditor(null)}
        />
      </div>
    )
  }

  const canAdd = engineState === 'ready' && !busy && pages.length < maxPages

  return (
    <div
      className={dragOver ? 'scanner-module is-drag-over' : 'scanner-module'}
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={handleDrop}
    >
      {/* The phone's own camera app, at full resolution. */}
      <input
        ref={cameraInput}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={handleInput}
      />
      <input ref={filesInput} type="file" accept="image/*" multiple hidden onChange={handleInput} />

      <div className="scanner-module__toolbar">
        <button
          type="button"
          className="scanner-module__button is-primary"
          disabled={!canAdd}
          onClick={() => cameraInput.current?.click()}
        >
          {labels.takePhoto}
        </button>
        <button
          type="button"
          className="scanner-module__button"
          disabled={!canAdd}
          onClick={() => filesInput.current?.click()}
        >
          {labels.choosePhotos}
        </button>
      </div>

      {engineState === 'loading' && <p className="scanner-module__hint">{labels.loading}</p>}
      {engineState === 'failed' && <p className="scanner-module__error">{labels.loadFailed}</p>}
      {error && <p className="scanner-module__error">{error}</p>}

      {pages.length === 0 ? (
        <div className="scanner-module__empty">
          <p>{labels.emptyHint}</p>
          <p className="scanner-module__muted">{labels.dropHint}</p>
        </div>
      ) : (
        <ol className="scanner-module__pages">
          {pages.map((page, index) => (
            <li key={page.id} className="scanner-module__page">
              <img src={page.thumbnailUrl} alt={labels.pageLabel(index + 1)} />
              <div className="scanner-module__page-caption">
                <span>{labels.pageLabel(index + 1)}</span>
                {page.needsCheck && (
                  <span className="scanner-module__badge">{labels.checkCorners}</span>
                )}
              </div>
              <div className="scanner-module__page-actions">
                <button
                  type="button"
                  className="scanner-module__button is-small"
                  disabled={busy}
                  onClick={() => editPage(page)}
                >
                  {labels.editCorners}
                </button>
                <button
                  type="button"
                  className="scanner-module__button is-small"
                  disabled={busy}
                  onClick={() => rotatePage(page)}
                >
                  {labels.rotate}
                </button>
                <button
                  type="button"
                  className="scanner-module__button is-small is-danger"
                  disabled={busy}
                  onClick={() => removePage(page)}
                >
                  {labels.remove}
                </button>
              </div>
            </li>
          ))}
        </ol>
      )}

      <div className="scanner-module__toolbar">
        <span className="scanner-module__spacer" />
        <button type="button" className="scanner-module__button" onClick={handleCancel}>
          {labels.cancel}
        </button>
        <button
          type="button"
          className="scanner-module__button is-primary"
          disabled={pages.length === 0 || busy}
          onClick={() => onComplete(pages.map((p) => p.result))}
        >
          {labels.done}
        </button>
      </div>

      {busy && (
        <div className="scanner-module__busy" role="status">
          <span className="scanner-module__spinner" />
          <span>{labels.processing}</span>
        </div>
      )}
    </div>
  )
}

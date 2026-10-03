import { useEffect, useState } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faArrowLeft,
  faDownload,
  faEnvelope,
  faFilePdf,
  faPlus,
  faRotateRight,
  faShareNodes,
  faTriangleExclamation,
} from '@fortawesome/free-solid-svg-icons'
import { DocumentScanner, type ScannedPage } from '../scanner'
import { documentService, type CreatedPdf, type DocumentCapabilities } from '../services/documentService'
import { recipientDisplayName, recipientService, type Recipient } from '../services/recipientService'
import { downloadBlob } from '../services/download'
import { getErrorMessage } from '../services/apiError'
import { VMCISelector } from '../components/VMCIUIComponents'

const scannerLabels = { done: 'Pdf maken' }

function defaultDocumentName(): string {
  const now = new Date()
  const pad = (n: number) => String(n).padStart(2, '0')
  return `Scan ${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ${pad(now.getHours())}.${pad(now.getMinutes())}`
}

function pdfFileName(name: string): string {
  const trimmed = name.trim().replace(/\.pdf$/i, '')
  return `${trimmed || defaultDocumentName()}.pdf`
}

function formatSize(bytes: number): string {
  return bytes < 1024 * 1024 ? `${Math.round(bytes / 1024)} kB` : `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

/**
 * The main screen. The scanner module stays mounted (hidden) while the result screen shows, so
 * "Terug" returns to the same pages; "Nieuwe scan" remounts it empty.
 */
function Scan() {
  const [scannerKey, setScannerKey] = useState(0)
  const [pages, setPages] = useState<ScannedPage[] | null>(null)
  const [pdf, setPdf] = useState<CreatedPdf | null>(null)
  const [documentName, setDocumentName] = useState(defaultDocumentName)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)
  const [isCreating, setIsCreating] = useState(false)
  const [capabilities, setCapabilities] = useState<DocumentCapabilities | null>(null)

  useEffect(() => {
    documentService.getCapabilities().then(setCapabilities, () => setCapabilities(null))
  }, [])

  const createPdf = async (scanned: ScannedPage[]) => {
    setError(null)
    setNotice(null)
    setIsCreating(true)
    try {
      setPdf(await documentService.createPdf(scanned, documentName))
    } catch (err) {
      // The pages stay in memory, so the user can retry once the connection is back.
      setError(getErrorMessage(err, 'De pdf kon niet gemaakt worden.'))
    } finally {
      setIsCreating(false)
    }
  }

  const handleComplete = (scanned: ScannedPage[]) => {
    setPages(scanned)
    setPdf(null)
    void createPdf(scanned)
  }

  const startOver = () => {
    setPages(null)
    setPdf(null)
    setError(null)
    setNotice(null)
    setDocumentName(defaultDocumentName())
    setScannerKey((k) => k + 1)
  }

  const fileName = pdfFileName(documentName)
  const pdfFile = pdf ? new File([pdf.blob], fileName, { type: 'application/pdf' }) : null
  // Sharing files needs the Web Share API level 2; Firefox on the desktop, for one, lacks it.
  const canShare = Boolean(pdfFile && navigator.canShare?.({ files: [pdfFile] }))

  const share = async () => {
    if (!pdfFile) return
    try {
      // Must run straight from the tap: browsers refuse share() without a user gesture.
      await navigator.share({ files: [pdfFile], title: fileName })
    } catch (err) {
      if ((err as DOMException).name !== 'AbortError') {
        setError('Delen is mislukt. Gebruik Downloaden.')
      }
    }
  }

  return (
    <div className="container py-2" style={{ maxWidth: '60rem' }}>
      <div hidden={pages !== null}>
        <h1 className="h3 mb-3">Document scannen</h1>
        <DocumentScanner
          key={scannerKey}
          maxPages={capabilities?.maxPages ?? 20}
          labels={scannerLabels}
          onComplete={handleComplete}
          onCancel={startOver}
        />
      </div>

      {pages !== null && (
        <div className="scanner-panel p-3 p-md-4">
          <h1 className="h3 mb-3">
            <FontAwesomeIcon icon={faFilePdf} className="me-2 text-body-secondary" />
            Uw pdf
          </h1>

          {error && (
            <div className="alert alert-danger d-flex flex-wrap align-items-center gap-2" role="alert">
              <span className="me-auto">{error}</span>
              {!pdf && (
                <button
                  type="button"
                  className="btn btn-sm btn-outline-danger"
                  disabled={isCreating}
                  onClick={() => void createPdf(pages)}
                >
                  <FontAwesomeIcon icon={faRotateRight} className="me-1" />
                  Opnieuw proberen
                </button>
              )}
            </div>
          )}
          {notice && (
            <div className="alert alert-success" role="status">
              {notice}
            </div>
          )}

          {isCreating && <p className="text-body-secondary">Pdf wordt gemaakt…</p>}

          {pdf && (
            <>
              {!pdf.searchable && (
                <div className="alert alert-warning" role="status">
                  <FontAwesomeIcon icon={faTriangleExclamation} className="me-2" />
                  De tekst in deze pdf is niet doorzoekbaar: tekstherkenning was niet beschikbaar.
                </div>
              )}

              <div className="mb-3">
                <label htmlFor="documentName" className="form-label">
                  Naam van het document
                </label>
                <div className="input-group">
                  <input
                    id="documentName"
                    type="text"
                    className="form-control"
                    value={documentName}
                    onChange={(e) => setDocumentName(e.target.value)}
                  />
                  <span className="input-group-text">.pdf</span>
                </div>
                <div className="form-text">
                  {pages.length} {pages.length === 1 ? 'pagina' : "pagina's"}, {formatSize(pdf.blob.size)}
                </div>
              </div>

              <div className="d-flex flex-wrap gap-2 mb-4">
                {canShare && (
                  <button type="button" className="btn btn-primary btn-lg" onClick={() => void share()}>
                    <FontAwesomeIcon icon={faShareNodes} className="me-2" />
                    Delen
                  </button>
                )}
                <button
                  type="button"
                  className={canShare ? 'btn btn-outline-primary btn-lg' : 'btn btn-primary btn-lg'}
                  onClick={() => downloadBlob(pdf.blob, fileName)}
                >
                  <FontAwesomeIcon icon={faDownload} className="me-2" />
                  Downloaden
                </button>
              </div>

              {capabilities?.email && (
                <EmailSection
                  pdf={pdf.blob}
                  fileName={fileName}
                  onSent={(to) => {
                    setError(null)
                    setNotice(`De pdf is gemaild naar ${to}.`)
                  }}
                  onError={setError}
                />
              )}
            </>
          )}

          <div className="d-flex flex-wrap gap-2 border-top pt-3">
            <button type="button" className="btn btn-outline-secondary" onClick={() => setPages(null)}>
              <FontAwesomeIcon icon={faArrowLeft} className="me-2" />
              Terug naar de pagina&apos;s
            </button>
            <button type="button" className="btn btn-outline-secondary" onClick={startOver}>
              <FontAwesomeIcon icon={faPlus} className="me-2" />
              Nieuwe scan
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

interface EmailSectionProps {
  pdf: Blob
  fileName: string
  onSent: (to: string) => void
  onError: (message: string) => void
}

/** "Mailen naar..." the account's fixed recipients, plus adding a new address to that list. */
function EmailSection({ pdf, fileName, onSent, onError }: EmailSectionProps) {
  const [recipients, setRecipients] = useState<Recipient[]>([])
  const [selected, setSelected] = useState<Recipient | null>(null)
  const [isAdding, setIsAdding] = useState(false)
  const [newEmail, setNewEmail] = useState('')
  const [newLabel, setNewLabel] = useState('')
  const [isSending, setIsSending] = useState(false)

  useEffect(() => {
    recipientService.getMine().then(
      (list) => {
        setRecipients(list)
        if (list.length === 1) setSelected(list[0])
        if (list.length === 0) setIsAdding(true)
      },
      (err) => onError(getErrorMessage(err, 'De ontvangers konden niet geladen worden.'))
    )
  }, [onError])

  const addRecipient = async () => {
    try {
      const added = await recipientService.add(newEmail.trim(), newLabel.trim() || null)
      setRecipients((list) => (list.some((r) => r.id === added.id) ? list : [...list, added]))
      setSelected(added)
      setIsAdding(false)
      setNewEmail('')
      setNewLabel('')
    } catch (err) {
      onError(getErrorMessage(err, 'Het adres kon niet toegevoegd worden.'))
    }
  }

  const send = async () => {
    if (!selected) return
    setIsSending(true)
    try {
      await documentService.email(pdf, selected.email, fileName)
      onSent(recipientDisplayName(selected))
    } catch (err) {
      onError(getErrorMessage(err, 'Mailen is mislukt.'))
    } finally {
      setIsSending(false)
    }
  }

  return (
    <div className="mb-4">
      <h2 className="h5">
        <FontAwesomeIcon icon={faEnvelope} className="me-2 text-body-secondary" />
        Mailen naar…
      </h2>

      {recipients.length > 0 && (
        <div className="d-flex flex-wrap gap-2 align-items-start mb-2">
          <div className="flex-grow-1" style={{ minWidth: '14rem' }}>
            <VMCISelector
              options={recipients}
              selectedValue={selected}
              valueLabel={recipientDisplayName}
              placeholder="Kies een ontvanger"
              onValueChanged={(value) => setSelected(value as Recipient | null)}
            />
          </div>
          <button
            type="button"
            className="btn btn-primary"
            disabled={!selected || isSending}
            onClick={() => void send()}
          >
            {isSending ? 'Bezig met verzenden...' : 'Verzenden'}
          </button>
        </div>
      )}

      {isAdding ? (
        <div className="row g-2 align-items-end">
          <div className="col-12 col-md-5">
            <label htmlFor="newRecipientEmail" className="form-label">
              E-mailadres
            </label>
            <input
              id="newRecipientEmail"
              type="email"
              className="form-control"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-4">
            <label htmlFor="newRecipientLabel" className="form-label">
              Omschrijving
            </label>
            <input
              id="newRecipientLabel"
              type="text"
              className="form-control"
              value={newLabel}
              placeholder="bv. Boekhouding"
              onChange={(e) => setNewLabel(e.target.value)}
            />
          </div>
          <div className="col-12 col-md-3 d-flex gap-2">
            <button
              type="button"
              className="btn btn-outline-primary"
              disabled={!newEmail.trim()}
              onClick={() => void addRecipient()}
            >
              Toevoegen
            </button>
            {recipients.length > 0 && (
              <button type="button" className="btn btn-outline-secondary" onClick={() => setIsAdding(false)}>
                Annuleren
              </button>
            )}
          </div>
          <div className="form-text">Een nieuw adres blijft in uw lijst staan.</div>
        </div>
      ) : (
        <button type="button" className="btn btn-link px-0" onClick={() => setIsAdding(true)}>
          <FontAwesomeIcon icon={faPlus} className="me-1" />
          Ander adres toevoegen
        </button>
      )}
    </div>
  )
}

export default Scan

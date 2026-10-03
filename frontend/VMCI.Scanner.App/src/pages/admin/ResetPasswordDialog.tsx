import { useState } from 'react'
import { ConfirmDialog } from '../../components/ConfirmDialog'
import { RequiredMark } from '../../components/FormControls'
import { adminService, MIN_TEMPORARY_PASSWORD_LENGTH, type AdminAccount } from '../../services/adminService'
import { getErrorMessage } from '../../services/apiError'

interface ResetPasswordDialogProps {
  account: AdminAccount | null
  onDone: (updated: AdminAccount) => void
  onCancel: () => void
}

/**
 * Sets a new temporary password. The account is signed out on every device and must choose an own
 * password at its next login. The administrator hands the temporary password over in person.
 */
export function ResetPasswordDialog({ account, onDone, onCancel }: ResetPasswordDialogProps) {
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const close = () => {
    setPassword('')
    setError(null)
    onCancel()
  }

  const confirm = async () => {
    if (!account) return
    if (password.length < MIN_TEMPORARY_PASSWORD_LENGTH) {
      setError(`Het tijdelijke wachtwoord moet minstens ${MIN_TEMPORARY_PASSWORD_LENGTH} tekens lang zijn.`)
      return
    }
    setIsSaving(true)
    try {
      const updated = await adminService.resetPassword(account.id, password)
      setPassword('')
      setError(null)
      onDone(updated)
    } catch (err) {
      setError(getErrorMessage(err, 'Het wachtwoord kon niet ingesteld worden.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <ConfirmDialog
      show={account !== null}
      title="Nieuw tijdelijk wachtwoord"
      variant="primary"
      confirmLabel="Instellen"
      isConfirming={isSaving}
      error={error}
      onConfirm={() => void confirm()}
      onCancel={close}
      message={
        <>
          <p>
            {account?.firstName} {account?.surName} wordt op alle toestellen afgemeld en moet bij de
            volgende aanmelding een eigen wachtwoord kiezen.
          </p>
          <label htmlFor="temporaryPassword" className="form-label">
            Tijdelijk wachtwoord
            <RequiredMark invalid={Boolean(error)} />
          </label>
          <input
            id="temporaryPassword"
            type="text"
            className="form-control"
            autoComplete="off"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </>
      }
    />
  )
}

import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { FormActions, FormField, PageHeader, ValidationChecklist } from '@vmci/ui'
import { useAuth } from '../contexts/AuthContext'
import { ROUTE_PATHS } from '../config/routes'
import { accountService } from '../services/accountService'
import { getErrorMessage } from '../services/apiError'
import { passwordRuleError, passwordRules } from '../services/passwordRules'

interface FieldErrors {
  currentPassword?: string
  newPassword?: string
  confirmPassword?: string
}

/**
 * First login, or after the administrator reset the password: the user replaces the temporary
 * password before they can do anything else. "Annuleren" signs out.
 */
function ChangePassword() {
  const { user, applySession, logout } = useAuth()
  const navigate = useNavigate()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({})
  const [error, setError] = useState<string | null>(null)
  const [isSaving, setIsSaving] = useState(false)

  const validate = (): FieldErrors => {
    const errors: FieldErrors = {}
    if (!currentPassword) errors.currentPassword = 'Tijdelijk wachtwoord is verplicht.'
    const rule = passwordRuleError(newPassword)
    if (!newPassword) errors.newPassword = 'Nieuw wachtwoord is verplicht.'
    else if (rule) errors.newPassword = rule
    else if (newPassword === currentPassword)
      errors.newPassword = 'Het nieuwe wachtwoord moet verschillen van het tijdelijke.'
    if (confirmPassword !== newPassword) errors.confirmPassword = 'De twee wachtwoorden zijn niet gelijk.'
    return errors
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    const errors = validate()
    setFieldErrors(errors)
    if (Object.keys(errors).length > 0) {
      setError('Corrigeer de gemarkeerde velden.')
      return
    }

    setIsSaving(true)
    try {
      applySession(await accountService.changePassword(currentPassword, newPassword))
      navigate(ROUTE_PATHS.HOME, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Wijzigen van wachtwoord mislukt'))
      setIsSaving(false)
    }
  }

  const handleCancel = async () => {
    await logout()
    navigate(ROUTE_PATHS.LOGIN, { replace: true })
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-5">
          <PageHeader
            title="Kies uw wachtwoord"
            subtitle={
              <>
                {user?.firstName ? `Welkom, ${user.firstName}. ` : ''}U bent aangemeld met een tijdelijk
                wachtwoord. Kies een eigen wachtwoord om verder te gaan; daarna blijft u op dit toestel
                aangemeld.
              </>
            }
            className="mb-4"
          />

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            <FormField
              label="Tijdelijk wachtwoord"
              required
              error={fieldErrors.currentPassword}
              disabled={isSaving}
              className="mb-3"
            >
              <input
                type="password"
                className="form-control"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                autoComplete="current-password"
              />
            </FormField>
            <FormField
              label="Nieuw wachtwoord"
              required
              error={fieldErrors.newPassword}
              hint={<ValidationChecklist rules={passwordRules(newPassword)} />}
              disabled={isSaving}
              className="mb-3"
            >
              <input
                type="password"
                className="form-control"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                autoComplete="new-password"
              />
            </FormField>
            <FormField
              label="Nieuw wachtwoord bevestigen"
              required
              error={fieldErrors.confirmPassword}
              disabled={isSaving}
              className="mb-3"
            >
              <input
                type="password"
                className="form-control"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                autoComplete="new-password"
              />
            </FormField>
            <FormActions isBusy={isSaving} onCancel={() => void handleCancel()} />
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword

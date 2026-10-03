import { useState, FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { ROUTE_PATHS } from '../config/routes'
import { accountService } from '../services/accountService'
import { getErrorMessage } from '../services/apiError'
import { FormActions, RequiredMark } from '../components/FormControls'
import { PASSWORD_RULE_TEXT, passwordRuleError } from '../services/passwordRules'

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

  const field = (
    id: keyof FieldErrors,
    label: string,
    value: string,
    onChange: (value: string) => void,
    autoComplete: string
  ) => (
    <div className="mb-3">
      <label htmlFor={id} className="form-label">
        {label}
        <RequiredMark invalid={Boolean(fieldErrors[id])} />
      </label>
      <input
        type="password"
        className={`form-control${fieldErrors[id] ? ' is-invalid' : ''}`}
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={isSaving}
        autoComplete={autoComplete}
      />
      {fieldErrors[id] && <div className="invalid-feedback">{fieldErrors[id]}</div>}
    </div>
  )

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-5">
          <h1 className="mb-2">Kies uw wachtwoord</h1>
          <p className="text-body-secondary mb-4">
            {user?.firstName ? `Welkom, ${user.firstName}. ` : ''}U bent aangemeld met een tijdelijk
            wachtwoord. Kies een eigen wachtwoord om verder te gaan; daarna blijft u op dit toestel
            aangemeld.
          </p>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate>
            {field('currentPassword', 'Tijdelijk wachtwoord', currentPassword, setCurrentPassword, 'current-password')}
            {field('newPassword', 'Nieuw wachtwoord', newPassword, setNewPassword, 'new-password')}
            {field('confirmPassword', 'Nieuw wachtwoord bevestigen', confirmPassword, setConfirmPassword, 'new-password')}
            <div className="form-text">{PASSWORD_RULE_TEXT}</div>
            <FormActions isSaving={isSaving} onCancel={() => void handleCancel()} />
          </form>
        </div>
      </div>
    </div>
  )
}

export default ChangePassword

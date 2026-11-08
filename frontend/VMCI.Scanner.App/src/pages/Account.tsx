import { useEffect, useState, FormEvent } from 'react'
import axios from 'axios'
import { faUser, faLock } from '@fortawesome/free-solid-svg-icons'
import {
  FormField,
  LabeledValue,
  LoadingState,
  PageHeader,
  SectionHeader,
  ValidationChecklist,
} from '@vmci/ui'
import { useAuth } from '../contexts/AuthContext'
import { accountService } from '../services/accountService'
import { passwordRuleError, passwordRules } from '../services/passwordRules'

// Extracts a human-readable message from a failed API call. Handles the plain
// `{ message: "..." }` bodies returned by AccountController's BadRequest/Unauthorized
// responses, as well as ASP.NET Core's ValidationProblemDetails shape (`errors`/`title`)
// returned by ValidationProblem(ModelState) when required fields are missing.
function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as
      { message?: string; title?: string; errors?: Record<string, string[]> } | undefined

    if (data?.message) return data.message
    if (data?.errors) {
      const firstError = Object.values(data.errors)[0]?.[0]
      if (firstError) return firstError
    }
    if (data?.title) return data.title
  }

  return err instanceof Error ? err.message : fallback
}

function Account() {
  const { updateUser, applySession } = useAuth()

  // Profile section state
  const [firstName, setFirstName] = useState('')
  const [surName, setSurName] = useState('')
  const [email, setEmail] = useState('')
  const [roleName, setRoleName] = useState('')
  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [profileError, setProfileError] = useState<string | null>(null)
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null)
  const [isSavingProfile, setIsSavingProfile] = useState(false)

  // Change-password section state
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmNewPassword, setConfirmNewPassword] = useState('')
  const [passwordError, setPasswordError] = useState<string | null>(null)
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null)
  const [isSavingPassword, setIsSavingPassword] = useState(false)

  useEffect(() => {
    let cancelled = false

    const loadProfile = async () => {
      setIsLoadingProfile(true)
      setProfileError(null)
      try {
        const profile = await accountService.getProfile()
        if (cancelled) return
        setFirstName(profile.firstName)
        setSurName(profile.surName)
        setEmail(profile.email)
        setRoleName(profile.roleName)
      } catch (err) {
        if (!cancelled) {
          setProfileError(getErrorMessage(err, 'Laden van profiel mislukt'))
        }
      } finally {
        if (!cancelled) {
          setIsLoadingProfile(false)
        }
      }
    }

    void loadProfile()

    return () => {
      cancelled = true
    }
  }, [])

  const handleProfileSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setProfileError(null)
    setProfileSuccess(null)
    setIsSavingProfile(true)

    try {
      const updated = await accountService.updateProfile(firstName, surName)
      setFirstName(updated.firstName)
      setSurName(updated.surName)
      updateUser({ firstName: updated.firstName, surName: updated.surName })
      setProfileSuccess('Profiel opgeslagen.')
    } catch (err) {
      setProfileError(getErrorMessage(err, 'Opslaan van profiel mislukt'))
    } finally {
      setIsSavingProfile(false)
    }
  }

  const handlePasswordSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setPasswordError(null)
    setPasswordSuccess(null)

    if (newPassword !== confirmNewPassword) {
      setPasswordError('Het nieuwe wachtwoord en de bevestiging komen niet overeen.')
      return
    }

    const ruleError = passwordRuleError(newPassword)
    if (ruleError) {
      setPasswordError(ruleError)
      return
    }

    setIsSavingPassword(true)
    try {
      // Re-issues this device's cookie; every other device is signed out.
      applySession(await accountService.changePassword(currentPassword, newPassword))
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setPasswordSuccess('Wachtwoord gewijzigd. Op uw andere toestellen moet u opnieuw aanmelden.')
    } catch (err) {
      setPasswordError(getErrorMessage(err, 'Wijzigen van wachtwoord mislukt'))
    } finally {
      setIsSavingPassword(false)
    }
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8 col-xl-6">
          <PageHeader title="Account" subtitle="Beheer uw profiel en wachtwoord." className="mb-4" />

          <div className="vmci-panel p-3 p-md-4 mb-4">
            <SectionHeader title="Profiel" icon={faUser} className="mb-3" />

            {isLoadingProfile ? (
              <LoadingState size="sm" labels={{ loading: 'Profiel laden...' }} />
            ) : (
              <form onSubmit={handleProfileSubmit}>
                {profileError && (
                  <div className="alert alert-danger" role="alert">
                    {profileError}
                  </div>
                )}
                {profileSuccess && (
                  <div className="alert alert-success" role="alert">
                    {profileSuccess}
                  </div>
                )}

                <FormField label="Voornaam" className="mb-3" disabled={isSavingProfile}>
                  <input
                    type="text"
                    className="form-control"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    autoComplete="given-name"
                  />
                </FormField>

                <FormField label="Naam" className="mb-3" disabled={isSavingProfile}>
                  <input
                    type="text"
                    className="form-control"
                    value={surName}
                    onChange={(e) => setSurName(e.target.value)}
                    required
                    autoComplete="family-name"
                  />
                </FormField>

                {/* Read-only: there is no way to change the e-mail address or the role here. */}
                <LabeledValue label="E-mailadres" className="mb-3">
                  {email}
                </LabeledValue>

                <LabeledValue label="Rol" className="mb-1">
                  {roleName}
                </LabeledValue>
                <div className="form-text mb-3">Uw rol wordt beheerd door een beheerder.</div>

                <button type="submit" className="btn btn-primary" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Bezig met opslaan...' : 'Profiel opslaan'}
                </button>
              </form>
            )}
          </div>

          <div className="vmci-panel p-3 p-md-4">
            <SectionHeader title="Wachtwoord wijzigen" icon={faLock} className="mb-3" />

            <form onSubmit={handlePasswordSubmit}>
              {passwordError && (
                <div className="alert alert-danger" role="alert">
                  {passwordError}
                </div>
              )}
              {passwordSuccess && (
                <div className="alert alert-success" role="alert">
                  {passwordSuccess}
                </div>
              )}

              <FormField label="Huidig wachtwoord" className="mb-3" disabled={isSavingPassword}>
                <input
                  type="password"
                  className="form-control"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                />
              </FormField>

              <FormField
                label="Nieuw wachtwoord"
                className="mb-3"
                disabled={isSavingPassword}
                hint={<ValidationChecklist rules={passwordRules(newPassword)} />}
              >
                <input
                  type="password"
                  className="form-control"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </FormField>

              <FormField label="Nieuw wachtwoord bevestigen" className="mb-3" disabled={isSavingPassword}>
                <input
                  type="password"
                  className="form-control"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                />
              </FormField>

              <button type="submit" className="btn btn-primary" disabled={isSavingPassword}>
                {isSavingPassword ? 'Bezig met opslaan...' : 'Wachtwoord opslaan'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Account

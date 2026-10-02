import { useEffect, useState, FormEvent } from 'react'
import axios from 'axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faUser, faLock } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'
import { accountService } from '../services/accountService'

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
  const { updateUser } = useAuth()

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

    setIsSavingPassword(true)
    try {
      await accountService.changePassword(currentPassword, newPassword)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmNewPassword('')
      setPasswordSuccess('Wachtwoord gewijzigd.')
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
          <h1>Account</h1>
          <p className="text-body-secondary mb-4">Beheer uw profiel en wachtwoord.</p>

          <div className="scanner-panel p-3 p-md-4 mb-4">
            <h2 className="h5 mb-3">
              <FontAwesomeIcon icon={faUser} className="me-2 text-body-secondary" />
              Profiel
            </h2>

            {isLoadingProfile ? (
              <p className="scanner-muted small mb-0">Profiel laden...</p>
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

                <div className="mb-3">
                  <label htmlFor="firstName" className="form-label">
                    Voornaam
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="firstName"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={isSavingProfile}
                    autoComplete="given-name"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="surName" className="form-label">
                    Naam
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="surName"
                    value={surName}
                    onChange={(e) => setSurName(e.target.value)}
                    required
                    disabled={isSavingProfile}
                    autoComplete="family-name"
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    E-mailadres
                  </label>
                  <input
                    type="email"
                    className="form-control"
                    id="email"
                    value={email}
                    disabled
                    readOnly
                  />
                </div>

                <div className="mb-3">
                  <label htmlFor="role" className="form-label">
                    Rol
                  </label>
                  {/* Read-only display of the role. This is intentionally not an editable
                      form control - there is no way to submit a role change from this page. */}
                  <input
                    type="text"
                    className="form-control"
                    id="role"
                    value={roleName}
                    disabled
                    readOnly
                    aria-readonly="true"
                  />
                  <div className="form-text">Uw rol wordt beheerd door een beheerder.</div>
                </div>

                <button type="submit" className="btn btn-primary" disabled={isSavingProfile}>
                  {isSavingProfile ? 'Bezig met opslaan...' : 'Profiel opslaan'}
                </button>
              </form>
            )}
          </div>

          <div className="scanner-panel p-3 p-md-4">
            <h2 className="h5 mb-3">
              <FontAwesomeIcon icon={faLock} className="me-2 text-body-secondary" />
              Wachtwoord wijzigen
            </h2>

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

              <div className="mb-3">
                <label htmlFor="currentPassword" className="form-label">
                  Huidig wachtwoord
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="currentPassword"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  required
                  disabled={isSavingPassword}
                  autoComplete="current-password"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="newPassword" className="form-label">
                  Nieuw wachtwoord
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="newPassword"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isSavingPassword}
                  autoComplete="new-password"
                />
              </div>

              <div className="mb-3">
                <label htmlFor="confirmNewPassword" className="form-label">
                  Nieuw wachtwoord bevestigen
                </label>
                <input
                  type="password"
                  className="form-control"
                  id="confirmNewPassword"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  required
                  disabled={isSavingPassword}
                  autoComplete="new-password"
                />
              </div>

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

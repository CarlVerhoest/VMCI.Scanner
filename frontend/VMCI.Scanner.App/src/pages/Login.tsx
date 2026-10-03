import { useState, FormEvent } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightToBracket } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'
import { ROUTE_PATHS } from '../config/routes'
import { getErrorMessage } from '../services/apiError'

function Login() {
  const { login, user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // This device is already signed in (the login cookie persists): nothing to do here.
  if (user && !isLoading) {
    return <Navigate to={ROUTE_PATHS.HOME} replace />
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      const signedIn = await login(email, password)
      const from = (location.state as { from?: string })?.from || ROUTE_PATHS.HOME
      navigate(signedIn.mustChangePassword ? ROUTE_PATHS.CHANGE_PASSWORD : from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Aanmelden mislukt'))
      setIsLoading(false)
    }
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
          <h1 className="mb-2">Aanmelden</h1>
          <p className="text-body-secondary mb-4">
            U meldt zich één keer aan op dit toestel; daarna blijft u aangemeld.
          </p>

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label htmlFor="email" className="form-label">
                E-mailadres
              </label>
              <input
                type="email"
                className="form-control"
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="email"
              />
            </div>

            <div className="mb-3">
              <label htmlFor="password" className="form-label">
                Wachtwoord
              </label>
              <input
                type="password"
                className="form-control"
                id="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>

            <button type="submit" className="btn btn-primary w-100" disabled={isLoading}>
              <FontAwesomeIcon icon={faRightToBracket} className="me-2" />
              {isLoading ? 'Bezig met aanmelden...' : 'Aanmelden'}
            </button>
          </form>

          <p className="text-body-secondary small mt-4">
            Wachtwoord vergeten? Vraag de beheerder om een nieuw tijdelijk wachtwoord.
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login

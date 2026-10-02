import { useState, FormEvent } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import axios from 'axios'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightToBracket } from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'
import { ROUTE_PATHS } from '../config/routes'

// The backend answers a failed login with a generic `{ message: "..." }` body (Dutch, see
// AuthController). Anything else - no response at all, a 500 - falls back to a Dutch message here
// rather than showing axios's English "Request failed with status code ...".
function getErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as { message?: string } | undefined
    return data?.message ?? fallback
  }

  return err instanceof Error ? err.message : fallback
}

function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)

    try {
      await login(email, password)
      const from = (location.state as { from?: string })?.from || ROUTE_PATHS.HOME
      navigate(from, { replace: true })
    } catch (err) {
      setError(getErrorMessage(err, 'Aanmelden mislukt'))
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-12 col-sm-10 col-md-8 col-lg-5 col-xl-4">
          <h1 className="mb-4">Aanmelden</h1>

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
        </div>
      </div>
    </div>
  )
}

export default Login

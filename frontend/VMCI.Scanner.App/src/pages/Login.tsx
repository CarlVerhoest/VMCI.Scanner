import { useState, FormEvent } from 'react'
import { Navigate, useNavigate, useLocation } from 'react-router-dom'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRightToBracket } from '@fortawesome/free-solid-svg-icons'
import { FormField, PageHeader } from '@vmci/ui'
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
          <PageHeader
            title="Aanmelden"
            subtitle="U meldt zich één keer aan op dit toestel; daarna blijft u aangemeld."
            className="mb-4"
          />

          {error && (
            <div className="alert alert-danger" role="alert">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit}>
            <FormField label="E-mailadres" controlId="email" disabled={isLoading} className="mb-3">
              <input
                type="email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
              />
            </FormField>

            <FormField label="Wachtwoord" controlId="password" disabled={isLoading} className="mb-3">
              <input
                type="password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </FormField>

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

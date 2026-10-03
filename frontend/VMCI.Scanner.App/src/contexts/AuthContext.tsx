import { createContext, useCallback, useContext, useEffect, useMemo, useState, ReactNode } from 'react'
import { authService, Session } from '../services/authService'
import { setSessionHandlers } from '../services/axiosConfig'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  surName: string
  isAdmin: boolean
  mustChangePassword: boolean
}

interface AuthContextType {
  user: AuthUser | null
  isAuthenticated: boolean
  // False until the startup session check has answered; until then nobody knows whether this
  // device is signed in, so routes wait instead of bouncing to the login page.
  isReady: boolean
  login: (email: string, password: string) => Promise<AuthUser>
  logout: () => Promise<void>
  applySession: (session: Session) => void
  updateUser: (partial: Partial<Omit<AuthUser, 'id'>>) => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// eslint-disable-next-line react-refresh/only-export-components
export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

function toUser(session: Session): AuthUser {
  return {
    id: session.accountId,
    email: session.email,
    firstName: session.firstName,
    surName: session.surName,
    isAdmin: session.isAdmin,
    mustChangePassword: session.mustChangePassword,
  }
}

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isReady, setIsReady] = useState(false)

  // The login is a persistent HttpOnly cookie, so a device that signed in once is still signed in
  // on every visit; ask the server who that is.
  useEffect(() => {
    let cancelled = false
    authService
      .me()
      .then((session) => {
        if (!cancelled) setUser(session ? toUser(session) : null)
      })
      .catch(() => {
        // Server unreachable: treat as signed out for now; the login page says why on retry.
      })
      .finally(() => {
        if (!cancelled) setIsReady(true)
      })
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    setSessionHandlers({
      onUnauthorized: () => setUser(null),
      onPasswordChangeRequired: () =>
        setUser((current) => (current ? { ...current, mustChangePassword: true } : current)),
    })
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    // Axios errors (e.g. the 401 of a bad login) propagate to Login.tsx, which shows them.
    const next = toUser(await authService.login(email, password))
    setUser(next)
    return next
  }, [])

  const logout = useCallback(async () => {
    try {
      await authService.logout()
    } finally {
      setUser(null)
    }
  }, [])

  const applySession = useCallback((session: Session) => setUser(toUser(session)), [])

  // Lets pages that edit the account (e.g. Account.tsx) refresh the cached name locally.
  const updateUser = useCallback((partial: Partial<Omit<AuthUser, 'id'>>) => {
    setUser((current) => (current ? { ...current, ...partial } : current))
  }, [])

  const value = useMemo<AuthContextType>(
    () => ({
      user,
      isAuthenticated: user !== null,
      isReady,
      login,
      logout,
      applySession,
      updateUser,
    }),
    [user, isReady, login, logout, applySession, updateUser]
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

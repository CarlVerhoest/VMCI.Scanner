import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { tokenService } from '../services/tokenService'
import { authService } from '../services/authService'
import { accountService } from '../services/accountService'

export interface AuthUser {
  id: string
  email: string
  firstName: string
  surName: string
  isAdmin: boolean
}

interface AuthContextType {
  user: AuthUser | null
  token: string | null
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
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

interface AuthProviderProps {
  children: ReactNode
}

export const AuthProvider = ({ children }: AuthProviderProps) => {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [token, setToken] = useState<string | null>(() => tokenService.getToken())

  // On a fresh page load with a still-persisted token (e.g. after F5), `token` starts non-null
  // (read synchronously from localStorage above) but `user` starts null - nothing has
  // rehydrated it yet. Without this, isAuthenticated is true (so ProtectedRoute correctly lets
  // the user through and API calls correctly carry the token) while the header still shows
  // "Log in" because it additionally checks `user`. Fetch the profile once on mount to close
  // that gap; if the token is actually expired/invalid, this 401s and the axios response
  // interceptor in axiosConfig.ts already clears it and redirects to /login.
  useEffect(() => {
    if (!token) return

    let cancelled = false

    const rehydrateUser = async () => {
      try {
        const [profile, claims] = await Promise.all([
          accountService.getProfile(),
          Promise.resolve(tokenService.decodeClaims(token)),
        ])
        if (cancelled || !claims) return

        setUser({
          id: claims.accountId,
          email: profile.email,
          firstName: profile.firstName,
          surName: profile.surName,
          isAdmin: claims.isAdmin,
        })
      } catch {
        // Invalid/expired token - the axios 401 interceptor already handles clearing it
        // and redirecting to /login, nothing further to do here.
      }
    }

    void rehydrateUser()

    return () => {
      cancelled = true
    }
  }, [token])

  const login = async (email: string, password: string) => {
    if (!email || !password) {
      throw new Error('E-mailadres en wachtwoord zijn verplicht')
    }

    // Let axios errors (e.g. 401 from a bad login) propagate to the caller -
    // Login.tsx's catch block is responsible for surfacing them.
    const result = await authService.login(email, password)

    tokenService.setToken(result.token)
    setToken(result.token)
    setUser({
      id: result.accountId,
      email: result.email,
      firstName: result.firstName,
      surName: result.surName,
      isAdmin: result.isAdmin,
    })
  }

  const logout = () => {
    tokenService.clearToken()
    setToken(null)
    setUser(null)
  }

  // Lets pages that edit the account (e.g. Account.tsx) refresh the cached name/email
  // locally after a successful save, without requiring a re-login to pick up the change
  // elsewhere in the app (header, profile menu, etc).
  const updateUser = (partial: Partial<Omit<AuthUser, 'id'>>) => {
    setUser((current) => (current ? { ...current, ...partial } : current))
  }

  const value: AuthContextType = {
    user,
    token,
    isAuthenticated: token !== null,
    login,
    logout,
    updateUser,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

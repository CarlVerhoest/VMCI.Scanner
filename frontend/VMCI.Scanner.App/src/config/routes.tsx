import { ReactElement, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Home from '../pages/Home'
import Login from '../pages/Login'
import Settings from '../pages/Settings'
import Account from '../pages/Account'

export const ROUTE_PATHS = {
  HOME: '/',
  LOGIN: '/login',
  SETTINGS: '/settings',
  ACCOUNT: '/account',
  // Per entity: LIST '/widgets', NEW '/widgets/new', EDIT '/widgets/:id/edit' (route pattern; build
  // actual links with a widgetEditPath(id) helper below, never by string concatenation in a page).
} as const

// Example helper, one per parameterized route:
// export function widgetEditPath(id: string): string {
//   return `/widgets/${id}/edit`
// }

export interface RouteConfig {
  path: string
  element: ReactElement
  needsAuthenticated: boolean
  needsIsAdmin: boolean
}

// Centralized route table. Add new pages here as the domain grows instead of
// scattering <Route> declarations across the app.
export const ROUTES: RouteConfig[] = [
  {
    path: ROUTE_PATHS.HOME,
    element: <Home />,
    needsAuthenticated: false,
    needsIsAdmin: false,
  },
  {
    path: ROUTE_PATHS.LOGIN,
    element: <Login />,
    needsAuthenticated: false,
    needsIsAdmin: false,
  },
  {
    path: ROUTE_PATHS.SETTINGS,
    element: <Settings />,
    needsAuthenticated: true,
    needsIsAdmin: false,
  },
  {
    path: ROUTE_PATHS.ACCOUNT,
    element: <Account />,
    needsAuthenticated: true,
    needsIsAdmin: false,
  },
]

interface ProtectedRouteProps {
  children: ReactNode
  needsAuthenticated: boolean
  needsIsAdmin: boolean
}

export function ProtectedRoute({
  children,
  needsAuthenticated,
  needsIsAdmin,
}: ProtectedRouteProps) {
  const { user, isAuthenticated } = useAuth()
  const location = useLocation()

  // Check authentication requirement
  if (needsAuthenticated && !isAuthenticated) {
    // Redirect to login with the intended destination
    return <Navigate to={ROUTE_PATHS.LOGIN} state={{ from: location.pathname }} replace />
  }

  if (needsIsAdmin) {
    // isAuthenticated is true as soon as a token exists, but `user` is only populated once the
    // async rehydrate in AuthContext has finished. Redirecting during that window would bounce a
    // genuine admin off their own page on every page refresh, so wait for the answer instead of
    // guessing it.
    if (user === null) {
      return null
    }

    if (!user.isAdmin) {
      // Home, not the login page: this user IS signed in, they simply may not be here. Sending
      // them to /login would suggest their session had expired.
      return <Navigate to={ROUTE_PATHS.HOME} replace />
    }
  }

  // All checks passed, render children
  return <>{children}</>
}

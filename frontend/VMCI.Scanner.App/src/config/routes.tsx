import { ReactElement, ReactNode } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Scan from '../pages/Scan'
import Login from '../pages/Login'
import ChangePassword from '../pages/ChangePassword'
import Settings from '../pages/Settings'
import Account from '../pages/Account'
import AdminAccounts from '../pages/admin/AdminAccounts'
import AdminAccountForm from '../pages/admin/AdminAccountForm'

export const ROUTE_PATHS = {
  HOME: '/',
  LOGIN: '/login',
  CHANGE_PASSWORD: '/change-password',
  SETTINGS: '/settings',
  ACCOUNT: '/account',
  ADMIN_ACCOUNTS: '/admin/accounts',
  ADMIN_ACCOUNT_NEW: '/admin/accounts/new',
  ADMIN_ACCOUNT_EDIT: '/admin/accounts/:id',
} as const

export function adminAccountEditPath(id: string): string {
  return `/admin/accounts/${id}`
}

export interface RouteConfig {
  path: string
  element: ReactElement
  needsAuthenticated: boolean
  needsIsAdmin: boolean
}

// Centralized route table. Add new pages here as the domain grows instead of
// scattering <Route> declarations across the app.
export const ROUTES: RouteConfig[] = [
  { path: ROUTE_PATHS.HOME, element: <Scan />, needsAuthenticated: true, needsIsAdmin: false },
  { path: ROUTE_PATHS.LOGIN, element: <Login />, needsAuthenticated: false, needsIsAdmin: false },
  {
    path: ROUTE_PATHS.CHANGE_PASSWORD,
    element: <ChangePassword />,
    needsAuthenticated: true,
    needsIsAdmin: false,
  },
  { path: ROUTE_PATHS.SETTINGS, element: <Settings />, needsAuthenticated: true, needsIsAdmin: false },
  { path: ROUTE_PATHS.ACCOUNT, element: <Account />, needsAuthenticated: true, needsIsAdmin: false },
  {
    path: ROUTE_PATHS.ADMIN_ACCOUNTS,
    element: <AdminAccounts />,
    needsAuthenticated: true,
    needsIsAdmin: true,
  },
  {
    path: ROUTE_PATHS.ADMIN_ACCOUNT_NEW,
    element: <AdminAccountForm />,
    needsAuthenticated: true,
    needsIsAdmin: true,
  },
  {
    path: ROUTE_PATHS.ADMIN_ACCOUNT_EDIT,
    element: <AdminAccountForm />,
    needsAuthenticated: true,
    needsIsAdmin: true,
  },
]

interface ProtectedRouteProps {
  children: ReactNode
  needsAuthenticated: boolean
  needsIsAdmin: boolean
}

export function ProtectedRoute({ children, needsAuthenticated, needsIsAdmin }: ProtectedRouteProps) {
  const { user, isReady } = useAuth()
  const location = useLocation()

  // Until the startup session check answers, nobody knows whether this device is signed in.
  if (!isReady) {
    return null
  }

  if (needsAuthenticated && !user) {
    return <Navigate to={ROUTE_PATHS.LOGIN} state={{ from: location.pathname }} replace />
  }

  // A temporary password from an administrator: nothing else until an own password is chosen.
  if (user?.mustChangePassword && location.pathname !== ROUTE_PATHS.CHANGE_PASSWORD) {
    return <Navigate to={ROUTE_PATHS.CHANGE_PASSWORD} replace />
  }

  if (needsIsAdmin && !user?.isAdmin) {
    // Home, not the login page: this user IS signed in, they simply may not be here.
    return <Navigate to={ROUTE_PATHS.HOME} replace />
  }

  return <>{children}</>
}

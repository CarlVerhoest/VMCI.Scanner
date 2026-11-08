import { useLocation, useNavigate } from 'react-router-dom'
import {
  faCamera,
  faGear,
  faIdCard,
  faRightFromBracket,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { AppHeader as VMCIAppHeader, type AppHeaderLink } from '@vmci/ui'
import { useAuth } from '../contexts/AuthContext'
import { ROUTE_PATHS } from '../config/routes'
import ScannerLogo from './ScannerLogo'

// Scanner's wrapper around the library's AppHeader: it supplies the logo, the links, the user
// menu and react-router navigation; the library component knows nothing about login or routes.
function AppHeader() {
  const { user, isAuthenticated, isReady, logout } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  const handleLogout = async () => {
    await logout()
    navigate(ROUTE_PATHS.LOGIN)
  }

  const signedIn = isAuthenticated && user ? user : null

  const links: AppHeaderLink[] = signedIn
    ? [
        { href: ROUTE_PATHS.HOME, icon: faCamera, label: 'Scannen' },
        {
          href: ROUTE_PATHS.ADMIN_ACCOUNTS,
          icon: faUsers,
          label: 'Accounts',
          hidden: !signedIn.isAdmin,
        },
      ].map((link) => ({ ...link, active: pathname === link.href }))
    : []

  return (
    <VMCIAppHeader
      className="mb-3"
      brand={<ScannerLogo height={32} />}
      brandHref={ROUTE_PATHS.HOME}
      onNavigate={(href) => navigate(href)}
      links={links}
      user={
        signedIn
          ? {
              title: signedIn.firstName,
              items: [
                { label: 'Instellingen', icon: faGear, href: ROUTE_PATHS.SETTINGS },
                { label: 'Account', icon: faIdCard, href: ROUTE_PATHS.ACCOUNT },
                { divider: true },
                { label: 'Afmelden', icon: faRightFromBracket, onClick: () => void handleLogout() },
              ],
            }
          : null
      }
      signedOutContent={
        // Only once the startup session check has answered: a signed-in device must not
        // flash "Aanmelden" on every page load.
        isReady ? (
          <button
            type="button"
            className="btn btn-outline-primary"
            onClick={() => navigate(ROUTE_PATHS.LOGIN)}
          >
            Aanmelden
          </button>
        ) : null
      }
    />
  )
}

export default AppHeader

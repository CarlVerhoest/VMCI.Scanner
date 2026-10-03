import { useNavigate, Link } from 'react-router-dom'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { Navbar, Container, Nav, NavDropdown } from 'react-bootstrap'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import {
  faUserCircle,
  faGear,
  faIdCard,
  faRightFromBracket,
  faBars,
  faCamera,
  faUsers,
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'
import { ROUTE_PATHS } from '../config/routes'
import ScannerLogo from './ScannerLogo'

interface ResourceLink {
  to: string
  icon: IconDefinition
  label: string
  // Left in the list but not rendered, in either the navbar or the hamburger menu.
  hidden?: boolean
}

function AppHeader() {
  const { user, isAuthenticated, isReady, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = async () => {
    await logout()
    navigate(ROUTE_PATHS.LOGIN)
  }

  // Primary resource links, shared between the inline (xl and up) navbar and the
  // hamburger dropdown shown on smaller screens so both stay in sync.
  const resourceLinks: ResourceLink[] = [
    { to: ROUTE_PATHS.HOME, icon: faCamera, label: 'Scannen' },
    { to: ROUTE_PATHS.ADMIN_ACCOUNTS, icon: faUsers, label: 'Accounts', hidden: !user?.isAdmin },
  ]

  const visibleResourceLinks = resourceLinks.filter((item) => !item.hidden)

  return (
    <Navbar bg="body-tertiary" className="mb-3 border-bottom">
      <Container fluid className="px-4">
        <Navbar.Brand as={Link} to={ROUTE_PATHS.HOME} className="d-flex align-items-center">
          <ScannerLogo height={32} />
        </Navbar.Brand>
        <div className="justify-content-end">
          {isAuthenticated && user ? (
            <Nav className="flex-row align-items-center">
              {/* Inline links: only from the xl breakpoint up */}
              {visibleResourceLinks.map((item) => (
                <Nav.Link
                  key={item.to}
                  as={Link}
                  to={item.to}
                  className="d-none d-xl-flex align-items-center"
                >
                  <FontAwesomeIcon icon={item.icon} className="me-2 text-body-secondary" />
                  {item.label}
                </Nav.Link>
              ))}
              {/* Hamburger menu: below the xl breakpoint */}
              <NavDropdown
                className="d-xl-none"
                title={<FontAwesomeIcon icon={faBars} />}
                id="menu-dropdown"
                align="end"
              >
                {visibleResourceLinks.map((item) => (
                  <NavDropdown.Item key={item.to} onClick={() => navigate(item.to)}>
                    <FontAwesomeIcon
                      icon={item.icon}
                      className="me-2 text-body-secondary"
                      fixedWidth
                    />
                    {item.label}
                  </NavDropdown.Item>
                ))}
              </NavDropdown>
              <NavDropdown
                title={
                  <span>
                    <FontAwesomeIcon icon={faUserCircle} className="me-2" />
                    {user.firstName}
                  </span>
                }
                id="profile-dropdown"
                align="end"
              >
                <NavDropdown.Item onClick={() => navigate(ROUTE_PATHS.SETTINGS)}>
                  <FontAwesomeIcon icon={faGear} className="me-2 text-body-secondary" fixedWidth />
                  Instellingen
                </NavDropdown.Item>
                <NavDropdown.Item onClick={() => navigate(ROUTE_PATHS.ACCOUNT)}>
                  <FontAwesomeIcon
                    icon={faIdCard}
                    className="me-2 text-body-secondary"
                    fixedWidth
                  />
                  Account
                </NavDropdown.Item>
                <NavDropdown.Divider />
                <NavDropdown.Item onClick={() => void handleLogout()}>
                  <FontAwesomeIcon
                    icon={faRightFromBracket}
                    className="me-2 text-body-secondary"
                    fixedWidth
                  />
                  Afmelden
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          ) : isReady ? (
            // Only once the startup session check has answered: a signed-in device must not
            // flash "Aanmelden" on every page load.
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => navigate(ROUTE_PATHS.LOGIN)}
            >
              Aanmelden
            </button>
          ) : null}
        </div>
      </Container>
    </Navbar>
  )
}

export default AppHeader

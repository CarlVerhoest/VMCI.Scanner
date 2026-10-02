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
} from '@fortawesome/free-solid-svg-icons'
import { useAuth } from '../contexts/AuthContext'
import { ROUTE_PATHS } from '../config/routes'
import logo from '../assets/logo.png'

interface ResourceLink {
  to: string
  icon: IconDefinition
  label: string
  // Left in the list but not rendered, in either the navbar or the hamburger menu.
  hidden?: boolean
}

function AppHeader() {
  const { user, isAuthenticated, logout } = useAuth()
  const navigate = useNavigate()

  const handleLogout = () => {
    logout()
    navigate(ROUTE_PATHS.HOME)
  }

  // Primary resource links, shared between the inline (xl and up) navbar and the
  // hamburger dropdown shown on smaller screens so both stay in sync.
  const resourceLinks: ResourceLink[] = [
    // One entry per top-level entity list, Dutch label, e.g.
    // { to: ROUTE_PATHS.WIDGETS, icon: faBoxes, label: 'Widgets' },
  ]

  const visibleResourceLinks = resourceLinks.filter((item) => !item.hidden)

  return (
    <Navbar bg="body-tertiary" className="mb-3 border-bottom">
      <Container fluid className="px-4">
        <Navbar.Brand as={Link} to={ROUTE_PATHS.HOME} className="d-flex align-items-center">
          <img src={logo} alt="Scanner" height={32} className="d-inline-block" />
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
                <NavDropdown.Item onClick={handleLogout}>
                  <FontAwesomeIcon
                    icon={faRightFromBracket}
                    className="me-2 text-body-secondary"
                    fixedWidth
                  />
                  Afmelden
                </NavDropdown.Item>
              </NavDropdown>
            </Nav>
          ) : (
            <button
              type="button"
              className="btn btn-outline-primary"
              onClick={() => navigate(ROUTE_PATHS.LOGIN)}
            >
              Aanmelden
            </button>
          )}
        </div>
      </Container>
    </Navbar>
  )
}

export default AppHeader

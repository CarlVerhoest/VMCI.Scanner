import { forwardRef, type ComponentPropsWithoutRef, type MouseEvent, type ReactNode } from 'react'
import clsx from 'clsx'
import Navbar from 'react-bootstrap/Navbar'
import Container from 'react-bootstrap/Container'
import Nav from 'react-bootstrap/Nav'
import NavItem from 'react-bootstrap/NavItem'
import NavLink from 'react-bootstrap/NavLink'
import Dropdown from 'react-bootstrap/Dropdown'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faBars, faUserCircle } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useLabels } from '../VMCIProvider/vmciContext'
import { appHeaderLabels, type AppHeaderLabels } from './AppHeader.labels'
import './AppHeader.css'

/** Bootstrap breakpoint from which the primary links are shown inline. */
export type AppHeaderBreakpoint = 'sm' | 'md' | 'lg' | 'xl' | 'xxl'

/** A primary link: inline from `inlineBreakpoint` up, in the hamburger menu below it. */
export interface AppHeaderLink {
  /** Where the link goes. With `onNavigate` the app navigates itself (no page reload). */
  href: string
  label: string
  icon?: IconDefinition
  /** Kept in the list but not rendered, e.g. an admin page for a non-admin. */
  hidden?: boolean
  /** The current page: marked with `aria-current="page"` and the active style. */
  active?: boolean
  /** React key; defaults to `href`. */
  key?: string
}

/** An entry of the user menu: an action (`onClick`), a link (`href`) or a divider. */
export type AppHeaderMenuItem =
  | {
      label: string
      icon?: IconDefinition
      /** Navigates like a primary link (through `onNavigate` when given). */
      href?: string
      onClick?: () => void
      disabled?: boolean
      hidden?: boolean
      key?: string
      divider?: never
    }
  | { divider: true; key?: string; hidden?: boolean }

/** The signed-in user's dropdown on the right. */
export interface AppHeaderUser {
  /** Content of the toggle, e.g. the user's first name. */
  title: ReactNode
  /** Icon before the title. Default: a user circle; `null` for none. */
  icon?: IconDefinition | null
  items: AppHeaderMenuItem[]
}

export interface AppHeaderProps extends Omit<
  ComponentPropsWithoutRef<'nav'>,
  'children' | 'onToggle' | 'onSelect'
> {
  /** Logo or app name; links to `brandHref`. */
  brand: ReactNode
  /** Target of the brand link. Default `/`. */
  brandHref?: string
  /** Primary links, rendered inline and in the hamburger menu from this one list. */
  links?: AppHeaderLink[]
  /** From this breakpoint up the links are inline; below it they are in a hamburger menu. */
  inlineBreakpoint?: AppHeaderBreakpoint
  /** The signed-in user. Without one, `signedOutContent` is shown instead of the user menu. */
  user?: AppHeaderUser | null
  /** Shown on the right when there is no `user`, e.g. a "Aanmelden" button. */
  signedOutContent?: ReactNode
  /**
   * Called instead of a full page load when a link (brand, primary link or menu `href`) is
   * clicked, e.g. `(href) => navigate(href)` with react-router. Ctrl/⌘/middle clicks keep the
   * browser's behaviour (new tab).
   */
  onNavigate?: (href: string) => void
  /** Overrides the default texts. */
  labels?: Partial<AppHeaderLabels>
}

function itemKey(item: { key?: string; href?: string; label?: string }, index: number) {
  return item.key ?? item.href ?? `${item.label ?? 'divider'}-${index}`
}

/**
 * The top bar of a VMCI app: brand, primary links (inline on wide screens, a hamburger menu on
 * narrow ones) and the user menu. Router-agnostic: links are `href`s, and `onNavigate` lets an
 * app with a client-side router navigate without reloading the page.
 */
export const AppHeader = forwardRef<HTMLElement, AppHeaderProps>(function AppHeader(
  {
    brand,
    brandHref = '/',
    links = [],
    inlineBreakpoint = 'xl',
    user,
    signedOutContent,
    onNavigate,
    labels,
    className,
    ...rest
  },
  ref,
) {
  const text = useLabels('appHeader', appHeaderLabels, labels)
  const visibleLinks = links.filter((link) => !link.hidden)

  const follow = (href: string) => (event: MouseEvent<HTMLElement>) => {
    if (!onNavigate || event.defaultPrevented) return
    // Leave modified clicks to the browser, so "open in new tab" keeps working.
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey)
      return
    event.preventDefault()
    onNavigate(href)
  }

  return (
    <Navbar
      ref={ref}
      aria-label={text.navigation}
      {...rest}
      className={clsx('vmci-app-header bg-body-tertiary border-bottom', className)}
    >
      <Container fluid className="vmci-app-header__container">
        <Navbar.Brand
          href={brandHref}
          onClick={follow(brandHref)}
          aria-label={text.home}
          className="vmci-app-header__brand"
        >
          {brand}
        </Navbar.Brand>
        <Nav className="vmci-app-header__nav">
          {visibleLinks.map((link) => (
            <NavLink
              key={link.key ?? link.href}
              href={link.href}
              onClick={follow(link.href)}
              active={link.active}
              aria-current={link.active ? 'page' : undefined}
              className={clsx('vmci-app-header__link d-none', `d-${inlineBreakpoint}-flex`)}
            >
              {link.icon && (
                <FontAwesomeIcon
                  icon={link.icon}
                  className="vmci-app-header__icon"
                  aria-hidden="true"
                />
              )}
              {link.label}
            </NavLink>
          ))}
          {visibleLinks.length > 0 && (
            <Dropdown as={NavItem} align="end" className={`d-${inlineBreakpoint}-none`}>
              <Dropdown.Toggle
                as={NavLink}
                className="vmci-app-header__toggle"
                aria-label={text.menu}
                title={text.menu}
              >
                <FontAwesomeIcon icon={faBars} fixedWidth aria-hidden="true" />
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {visibleLinks.map((link) => (
                  <Dropdown.Item
                    key={link.key ?? link.href}
                    href={link.href}
                    onClick={follow(link.href)}
                    active={link.active}
                    aria-current={link.active ? 'page' : undefined}
                    className="vmci-app-header__item"
                  >
                    {link.icon && (
                      <FontAwesomeIcon
                        icon={link.icon}
                        fixedWidth
                        className="vmci-app-header__icon"
                        aria-hidden="true"
                      />
                    )}
                    {link.label}
                  </Dropdown.Item>
                ))}
              </Dropdown.Menu>
            </Dropdown>
          )}
          {user ? (
            <Dropdown as={NavItem} align="end">
              <Dropdown.Toggle as={NavLink} className="vmci-app-header__toggle">
                {user.icon !== null && (
                  <FontAwesomeIcon
                    icon={user.icon ?? faUserCircle}
                    className="me-2"
                    aria-hidden="true"
                  />
                )}
                <span>{user.title}</span>
              </Dropdown.Toggle>
              <Dropdown.Menu>
                {user.items.map((item, index) =>
                  item.hidden ? null : item.divider ? (
                    <Dropdown.Divider key={itemKey(item, index)} />
                  ) : (
                    <Dropdown.Item
                      key={itemKey(item, index)}
                      as={item.href ? 'a' : 'button'}
                      type={item.href ? undefined : 'button'}
                      href={item.href}
                      disabled={item.disabled}
                      active={false}
                      onClick={(event: MouseEvent<HTMLElement>) => {
                        item.onClick?.()
                        if (item.href) follow(item.href)(event)
                      }}
                      className="vmci-app-header__item"
                    >
                      {item.icon && (
                        <FontAwesomeIcon
                          icon={item.icon}
                          fixedWidth
                          className="vmci-app-header__icon"
                          aria-hidden="true"
                        />
                      )}
                      {item.label}
                    </Dropdown.Item>
                  ),
                )}
              </Dropdown.Menu>
            </Dropdown>
          ) : (
            signedOutContent && (
              <div className="vmci-app-header__signed-out">{signedOutContent}</div>
            )
          )}
        </Nav>
      </Container>
    </Navbar>
  )
})

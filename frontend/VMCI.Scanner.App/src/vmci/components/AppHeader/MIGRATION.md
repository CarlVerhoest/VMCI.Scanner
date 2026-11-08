# Migratie naar `AppHeader`

## Vervangt

| Project | Oud pad | Oude componentnaam | Bronversie (commit) |
| ------- | ------- | ------------------ | ------------------- |
| VMCI.Scanner | `frontend/VMCI.Scanner.App/src/components/AppHeader.tsx` | `AppHeader` (default export) | `4400de4` |

De oude component was app-specifiek: hij las `useAuth()`, `ROUTE_PATHS` en `ScannerLogo` zelf en navigeerde met react-router. De nieuwe component kent geen router en geen login; de app geeft alles mee als props. Bouw daarom in de app een kleine wrapper (bv. `src/components/AppHeader.tsx` die de VMCI-`AppHeader` rendert) en houd daar de app-logica.

## Gebruik vinden

```text
regex: import\s+AppHeader\s+from\s+['"].*components/AppHeader['"]
regex: <AppHeader[\s>/]
```

Meestal is er één gebruiksplaats (de layout of `App.tsx`).

## Import

```tsx
// oud
import AppHeader from '../components/AppHeader'
// nieuw (in de app-wrapper)
import { AppHeader } from '@vmci/ui'
```

## Prop-mapping

De oude component had geen props. Elk hardgecodeerd onderdeel wordt een prop:

| Oud (Scanner, hardgecodeerd) | Nieuw | Omzetting / opmerking |
| ---------------------------- | ----- | --------------------- |
| `<Navbar.Brand as={Link} to={ROUTE_PATHS.HOME}><ScannerLogo height={32} /></Navbar.Brand>` | `brand={<ScannerLogo height={32} />}`, `brandHref={ROUTE_PATHS.HOME}` | `brandHref` is standaard `/`. De link krijgt `aria-label` "Naar de startpagina" (label `home`). |
| `resourceLinks: { to, icon, label, hidden }[]` | `links: { href, icon, label, hidden, active? }[]` | `to` → `href`. `hidden: !user?.isAdmin` blijft werken. Nieuw: `active` zet `aria-current="page"`. |
| Inline links `d-none d-xl-flex`, hamburger `d-xl-none` | `inlineBreakpoint="xl"` | `xl` is de standaard; elk Bootstrap-breakpoint kan. |
| `<Link to>` en `navigate(item.to)` (react-router) | `onNavigate={(href) => navigate(href)}` | Zonder `onNavigate` zijn het gewone links (volledige pagina-lading). Een ctrl/⌘/middelklik laat de component aan de browser (nieuw tabblad). |
| Gebruikersmenu-titel: `<FontAwesomeIcon icon={faUserCircle} /> {user.firstName}` | `user={{ title: user.firstName, items }}` | Het icoon `faUserCircle` is de standaard; ander icoon via `user.icon`, geen icoon met `icon: null`. |
| `NavDropdown.Item onClick={() => navigate(ROUTE_PATHS.SETTINGS)}` + `faGear` "Instellingen" | `{ label: 'Instellingen', icon: faGear, href: ROUTE_PATHS.SETTINGS }` | `href` gaat via `onNavigate`, net als een hoofdlink. Ook `onClick` kan. |
| idem "Account" (`faIdCard`) | `{ label: 'Account', icon: faIdCard, href: ROUTE_PATHS.ACCOUNT }` | |
| `NavDropdown.Divider` | `{ divider: true }` | |
| "Afmelden" (`faRightFromBracket`): `await logout(); navigate(ROUTE_PATHS.LOGIN)` | `{ label: 'Afmelden', icon: faRightFromBracket, onClick: () => void handleLogout() }` | `handleLogout` blijft in de app-wrapper. |
| `isAuthenticated && user ? … : isReady ? <button>Aanmelden</button> : null` | `user={isAuthenticated && user ? {…} : null}` en `signedOutContent={isReady ? <button …>Aanmelden</button> : null}` | Het uitstel tot de sessiecontrole antwoordt (geen flits van "Aanmelden") blijft de verantwoordelijkheid van de app. |
| Links alleen getoond als aangemeld | `links={isAuthenticated && user ? resourceLinks : []}` | De component toont `links` altijd; zonder links verdwijnt ook de hamburger. |
| `<Navbar bg="body-tertiary" className="mb-3 border-bottom">` | standaard `bg-body-tertiary border-bottom`; `className="mb-3"` | **De marge onder de balk staat niet meer in de component.** Geef `className="mb-3"` mee om hetzelfde uitzicht te houden. |
| `id="menu-dropdown"`, `id="profile-dropdown"` | _(geen)_ | De ids worden automatisch gemaakt. Werd er in CSS of tests op die ids gezocht, zoek dan op rol en naam (`getByRole('button', { name: 'Menu' })`). |

## Gedragswijzigingen

- De hamburger-knop heeft een toegankelijke naam ("Menu", label `menu`); vroeger had hij er geen.
- De `<nav>` heeft `aria-label` "Hoofdnavigatie" (label `navigation`).
- De links in het hamburgermenu en de menu-items met `href` zijn echte `<a href>`-links (vroeger knoppen met `onClick`). Ctrl/middelklik opent ze in een nieuw tabblad.
- De hamburger verschijnt alleen als er zichtbare links zijn.
- Links, toggles en (op touch) menu-items zijn minstens 44 px hoog.
- De zijmarge is 1 rem op telefoons en 1,5 rem vanaf `sm` (vroeger altijd `px-4`, 1,5 rem).

## Functionaliteit behouden

| Oud gebruik | Hoe nu |
| ----------- | ------ |
| Link verbergen voor niet-admins | `hidden: !user?.isAdmin` op de link, zoals vroeger. |
| Navigeren zonder herladen (react-router) | `onNavigate={(href) => navigate(href)}` |
| Eerst een actie, dan navigeren (afmelden) | `onClick` op het menu-item doet beide, zoals in de oude `handleLogout`. |
| "Aanmelden" pas tonen als de sessie gekend is | `signedOutContent={isReady ? … : null}` |

## Styling

- Geen eigen CSS meer in de app nodig. De klassen `vmci-app-header*` volgen `--bs-*`/`--vmci-*`; kleuren via de tokens van de app.
- Het logo (`ScannerLogo`) blijft in de app en wordt als `brand` meegegeven.

## Voorbeeld

```tsx
// oud
<AppHeader />

// nieuw: src/components/AppHeader.tsx in de app
import { useNavigate } from 'react-router-dom'
import { AppHeader as VMCIAppHeader } from '@vmci/ui'

function AppHeader() {
  const { user, isAuthenticated, isReady, logout } = useAuth()
  const navigate = useNavigate()
  const handleLogout = async () => {
    await logout()
    navigate(ROUTE_PATHS.LOGIN)
  }
  const signedIn = isAuthenticated && user
  return (
    <VMCIAppHeader
      className="mb-3"
      brand={<ScannerLogo height={32} />}
      brandHref={ROUTE_PATHS.HOME}
      onNavigate={(href) => navigate(href)}
      links={
        signedIn
          ? [
              { href: ROUTE_PATHS.HOME, icon: faCamera, label: 'Scannen' },
              { href: ROUTE_PATHS.ADMIN_ACCOUNTS, icon: faUsers, label: 'Accounts', hidden: !user.isAdmin },
            ]
          : []
      }
      user={
        signedIn
          ? {
              title: user.firstName,
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
        isReady ? (
          <button type="button" className="btn btn-outline-primary" onClick={() => navigate(ROUTE_PATHS.LOGIN)}>
            Aanmelden
          </button>
        ) : null
      }
    />
  )
}
```

## Controlelijst

- [ ] De oude `AppHeader` is vervangen door een wrapper rond de VMCI-`AppHeader` (zoekpatronen opnieuw uitgevoerd)
- [ ] Alle links, menu-items, het verbergen voor niet-admins en "Aanmelden" na de sessiecontrole werken zoals vroeger
- [ ] `onNavigate` is gezet: navigeren herlaadt de pagina niet
- [ ] `className="mb-3"` (of een andere marge) is meegegeven
- [ ] Typecheck, build en tests van de app slagen
- [ ] Visueel gecontroleerd in light en dark, op mobiele, tablet- en desktopbreedte

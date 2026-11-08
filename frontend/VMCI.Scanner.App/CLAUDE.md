# VMCI.Scanner.App Frontend Guidelines

## 🚨 The scanner module (`src/scanner/`) is portable

It will be lifted into the VMCI application unchanged. Inside that folder: **no imports from
outside it** except `react` and `@techstark/opencv-js` (ESLint enforces this), no backend calls, no
UI framework (plain React and `scanner.css`), no hard-coded text (everything through `labels`). The
app uses it only through `src/scanner/index.ts`. Read `src/scanner/README.md` before changing it.

It does **not** use the VMCI component library either. Its colours come from the `--scanner-*`
tokens it reads; `src/styles/app-tokens.css` points those at the `--vmci-*` tokens.

## Login

The login is an HttpOnly cookie; the frontend never holds a token. `AuthContext` asks
`GET /api/auth/me` at startup (`isReady` stays false until it answers, so routes wait instead of
bouncing to the login page). A user with a temporary password is routed to `/change-password` and
nowhere else; the API enforces the same with a 403 `PASSWORD_CHANGE_REQUIRED`, which the axios
interceptor turns into that redirect.

## 🚨 CRITICAL: UI components come from the VMCI component library (`@vmci/ui`)

Scanner uses the shared VMCI component library (repository `VMCI.UIComponents`, cloned next to this
repository as `../vmci.uicomponents`) **as source code**, copied per component into `src/vmci/` by
the library's CLI. `vmci.json` records which component is installed at which version and commit.

The library's own instructions are imported below. They are **Dutch**: `src/vmci/VMCI.md` is a
generated file that the CLI copies from the library, the one accepted exception to this repository's
"documentation in English" rule. Do not translate or edit it.

@src/vmci/VMCI.md

What that means here, in short:

- **Import from `@vmci/ui`** (`@vmci/ui/styles/...` for CSS), never from `src/vmci/...` paths.
- **Never edit, add or remove files in `src/vmci/` by hand.** Use `npm run vmci -- <command>`
  (`list`, `status`, `add`, `update`, `diff`, `contribute`, `remove`) from this folder. Pull the
  library first (`git -C ../../../vmci.uicomponents pull`).
- **Use what the library has before writing UI of your own**: `Table`/`List` for data, `Selector`
  for object-backed dropdowns, `DatePicker`, `FormField`/`RequiredMark`/`FormActions` for forms,
  `ConfirmDialog`, `PageHeader`/`SectionHeader`, `StatusChip`, `LabeledValue`, `LoadingState`,
  `Spinner`, `ThemeProvider`/`ThemeSwitch`, `SegmentedControl`, ... A component that is not
  installed yet comes in with `npm run vmci -- add <name>` (e.g. `date-picker`, or `be` for the
  Belgian national-register and company numbers).
- ❌ Never use `react-bootstrap`'s `<Table>` or a hand-rolled list for a data grid, `<select>` for an
  object-backed dropdown, or `<input type="date">`. Don't add a second table/select/date library.
- **A missing feature or a bug in a library component** is fixed in the copy and sent back with
  `npm run vmci -- contribute` after the user agreed, following the library's gate (branch, green
  `npm run check`, the owner's OK, fast-forward merge). Something only Scanner needs belongs in an
  app component that wraps the library one, not in `src/vmci/`.
- `src/vmci/` is excluded from this app's ESLint run: the library lints it with its own rules.

```tsx
import { Table, type TableColumn } from '@vmci/ui'

const columns: TableColumn<Account>[] = [
  { id: 'email', header: 'E-mailadres', accessorKey: 'email' },
  // ...
]

<Table aria-label="Accounts" data={accounts} columns={columns} rowKey="id" />
```

`pages/admin/AdminAccounts.tsx` is the worked example for a list page (search, sort, status chips,
row actions through `ActionMenu`, a "new" button in `toolbarStart`).

**Names are never shortened.** `Table` truncates text cells with an ellipsis by default; columns
holding a name or an address pass `wrap: true` so they wrap instead.

## Loading Data for Table

`Table` filters, sorts, and paginates **client-side** once the data is loaded. Prefer a single
unpaged API call (`GET /api/{resource}`) that returns the full collection, rather than building
server-side search/paging/sorting query parameters — that complexity is redundant once `Table` is
doing it in the browser. Only fall back to server-side paging if a dataset is large enough that
shipping it all to the browser in one call is genuinely a problem (thousands of rows) — that hasn't
come up yet in this app.

## Styling

Colours and fonts are **tokens**: the library's `--vmci-*` variables. `main.tsx` loads, in this
order, Bootstrap, `@vmci/ui/styles/vmci-tokens.css` (neutral defaults), `@vmci/ui/styles/vmci.css`
(the Bootstrap bridge and helper classes such as `vmci-panel`, `vmci-muted`, `vmci-accent-dot`), then
Scanner's own `src/styles/app-tokens.css`, which sets every token for light **and** dark. To change a
colour, change the token there — never hardcode a colour in a component or a `style` prop.

The theme is `data-bs-theme` on `<html>`, set by the library's `ThemeProvider` (`App.tsx`, storage
key `scanner-theme`). Components react to it through CSS only; read it with `useTheme()`.

The palette is the VMCI house style (logo green and brace grey). `app-tokens.css` also keeps
Scanner's deliberate differences from the library (dark-mode outline and secondary buttons, the
navbar surface) and maps the `--scanner-*` inputs of the portable scanner module.

`src/styles/theme.css` holds only what is specific to Scanner: the logo styles. The logo is rendered
by `src/components/ScannerLogo.tsx` (inline SVG, theme-aware through `--scanner-logo-*` in
`app-tokens.css`). The static files under `public/` (`logos/`, `favicon.svg`, PWA icons) are
generated by `scripts/make-logos.ps1` — never edit them by hand, and change the geometry in the
script and the component together.

## Global loading spinner

**Every server call already shows a spinner automatically — don't build a per-page loading
spinner just to cover "a request is in flight".**

`src/services/axiosConfig.ts`'s interceptors call the library's `beginHttpRequest`/`endHttpRequest`
for every `axiosInstance` request, and `App.tsx` wraps the routed content in one `Spinner` driven by
`useHttpActivity()` (both from `@vmci/ui`). Every `src/services/*Service.ts` call already goes
through the shared `axiosInstance`, so this covers any new service method for free — no per-page
`isLoading` state, manual `<Spinner>`, or local "Laden..." text needed on account of a request being
in flight.

Local `isLoading` state is still the right tool when it drives something other than _whether to
show a spinner_ — e.g. a list page's `isLoading` picks _what_ to render while data is missing (use
`LoadingState` there), and disabling a submit button while its own request is in flight is a
legitimate local concern too. The rule is specifically about not re-showing a spinner the app is
already showing.

The spinner's look is the library's (`Spinner` `variant`, colour from `--vmci-accent`); change it
there through `vmci contribute`, not with a second spinner in the app.

## 🚨 Form Patterns (all create/edit forms)

**Every form in this app follows the same conventions. New forms must match these;
`pages/admin/AdminAccountForm.tsx` is the reference implementation.** Use the library's form
components, don't hand-roll the markup:

### 1. Required vs. optional fields

- Wrap each control in `<FormField label="..." required error={fieldErrors.city}>`. It renders the
  label, the muted `*` that **turns red the moment that field fails validation**, the error message,
  `is-invalid` and the `aria-*` links. A `hint` goes under the control.

  ```tsx
  <FormField label="Gemeente" required error={fieldErrors.city} disabled={isSaving}>
    <input type="text" className="form-control" value={city} onChange={...} />
  </FormField>
  ```

- **Optional fields** render **no** marker, and specifically **no "Optional." helper text** under
  the input. Absence of the marker _is_ the "optional" signal.

- Which fields are required must mirror the backend DTO's `[Required]` attributes (e.g. the
  `<Entity>RequestBase` in `backend/VMCI.Scanner.WebApi/DTOs/`), so the client-side `validate()` and
  the server agree.

### 2. Save / Cancel placement

- The action buttons live in `<FormActions isBusy={isSaving} onCancel={handleCancel} />`, rendered
  **inside** the `<form>` (its `Opslaan` button is a `type="submit"` that relies on the form's
  `onSubmit`; the cancel button is always **`Annuleren`**). It right-aligns the buttons on wide
  screens, stacks them on phones, and disables both while `isBusy`. `disabled` greys out Opslaan only.

### 3. All user-facing form copy is in Dutch

- **Everything the user reads on a form is Dutch**: field labels, the page heading and
  description, button captions (`Opslaan` / `Annuleren`), the per-field validation messages
  returned by `validate()` (e.g. `'Gemeente is verplicht.'`), the submit summary banner
  (`'Corrigeer de gemarkeerde velden.'`), and the `getErrorMessage(...)` fallbacks for a failed
  load/save (e.g. `'Opslaan van gegevens mislukt'`). The library's default texts are Dutch too.
- `id`/`htmlFor`/state-key identifiers stay in English (they're not user-visible) — only the
  displayed strings are translated.

### 4. Password rules

The rules of the user's own password are in `src/services/passwordRules.ts` (they must match the
API's `PasswordService`). Show them live under the new-password field with
`<ValidationChecklist rules={passwordRules(newPassword)} />`.

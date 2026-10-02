# VMCI.Scanner.App Frontend Guidelines

## 🚨 CRITICAL: Use VMCIUIComponents for Lists, Tables, Selects, and Date Pickers

**All list/table, dropdown-select, and date-picker UI in this app MUST be built with the
components in `src/components/VMCIUIComponents/`** (`VMCIList`, `VMCITable`, `VMCISelector`,
`VMCIDatePicker`) rather than raw `react-bootstrap` (`Table`, `Form.Select`) or ad-hoc
`<input type="date">`/`<select>` markup.

These were ported from the sibling VMCI/KAZM.eSoar project's `UIComponents` library (its
`MyList`/`MyTable`/`MySelector`/`MyDatePicker`) so the two codebases share one interaction
pattern and visual language, and were made typesafe + updated against current dependency
versions in the process (see `VMCIUIComponents/CLAUDE.md` for what changed and why).

**FORBIDDEN:**

- ❌ **NEVER** use `react-bootstrap`'s `<Table>` directly for a data grid — use `VMCITable`
- ❌ **NEVER** hand-roll a filter/sort/pagination-driven list — use `VMCITable`
- ❌ **NEVER** use `<select>` / `Form.Select` for an object-backed dropdown — use `VMCISelector`
- ❌ **NEVER** use `<input type="date">` or pull in a different date-picker library — use
  `VMCIDatePicker`
- ❌ **NEVER** add a second date/table/select library (e.g. a different table package) without
  first checking whether `VMCIUIComponents` already covers the need

**CORRECT:**

```tsx
import { VMCITable, VMCITableColumn } from '@/components/VMCIUIComponents'

const columns: VMCITableColumn<Widget>[] = [
  { id: 'companyName', accessorKey: 'companyName', header: 'Company' },
  // ...
]

<VMCITable data={widgets} columns={columns} />
```

The first entity list page built in this app is the worked example to follow (search, sort,
responsive column priority, and row styling all driven through `VMCITable`).

**Simple static rows/columns without sorting or filtering** (e.g. a details panel laid out as
label/value pairs) can use `VMCIList` instead of `VMCITable`.

**If a genuinely new UI need doesn't fit these four components** (e.g. a chart, a calendar
month-view, a rich text editor), that's fine — pick an appropriate library as normal. This rule
is about the specific list/table/select/date-picker surface, not everything in the app.

## Loading Data for VMCITable

`VMCITable` filters, sorts, and paginates **client-side** once the data is loaded. Prefer a
single unpaged API call (`GET /api/{resource}`) that returns the full collection, rather than building server-side search/paging/sorting query
parameters — that complexity is redundant once `VMCITable` is doing it in the browser. Only
fall back to server-side paging if a dataset is large enough that shipping it all to the
browser in one call is genuinely a problem (thousands of rows) — that hasn't come up yet in
this app.

## Styling

Component styling (colors, spacing, icons) follows the shared `--scanner-*` CSS custom
properties defined in `src/styles/theme.css`, so `VMCIUIComponents` automatically follow the
app's light/dark mode (`data-bs-theme` on `<html>`, see `src/contexts/ThemeContext.tsx`) — do
not hardcode colors when extending these components.

## Global loading spinner

**Every server call already shows a spinner automatically — don't build a per-page loading
spinner just to cover "a request is in flight".**

`src/services/axiosConfig.ts`'s interceptors mark every `axiosInstance` request as in-flight
(via `src/hooks/useHttpActivity.ts`'s counter), and `App.tsx` wraps the routed content in one
`VMCISpinner` driven by that hook. Every `src/services/*Service.ts` call already goes through
the shared `axiosInstance`, so this covers any new service method for free — no per-page
`isLoading` state, manual `<VMCISpinner>`, or local `"Loading..."` text needed on account of a
request being in flight.

Local `isLoading` state is still the right tool when it drives something other than _whether to
show a spinner_ — e.g. a list page's `isLoading` picks _what_ to render (toolbar-only vs. the
full table) while data is missing, and disabling a submit button while its own request is
in flight is a legitimate local concern too. The rule is specifically about not re-showing a
spinner the app is already showing.

**To change the spinner style for the whole app, there is exactly one place to edit:**
`VMCIUIComponents/VMCISpinner.tsx`'s `Blocks` import — every spinner in the app renders through
that one component and nowhere else, so swapping the `react-loader-spinner` variant (or
library) there changes every screen at once.

## 🚨 Form Patterns (all create/edit forms)

**Every form in this app follows the same conventions. New forms must match these, and the
first entity form built in this app is the
reference implementation for the next one.** Two shared helpers in `src/components/FormControls.tsx` exist
specifically to keep these consistent — use them, don't hand-roll the markup:

### 1. Required vs. optional fields

- **Required fields** render a `<RequiredMark />` immediately after the label text. The marker
  is a muted `*` that **turns red the moment that field fails validation** — pass the field's
  own error state: `<RequiredMark invalid={Boolean(fieldErrors.city)} />`. Its color comes from
  the `.scanner-required-mark` / `.scanner-required-mark--invalid` classes in
  `src/styles/theme.css` (theme-aware, so don't hardcode a color).

  ```tsx
  <label htmlFor="city" className="form-label">
    Gemeente
    <RequiredMark invalid={Boolean(fieldErrors.city)} />
  </label>
  ```

- **Optional fields** render **nothing** — no `*`, and specifically **no "Optional." helper
  text** under the input. Absence of the marker _is_ the "optional" signal. (Do not add a
  `<div className="form-text">Optional.</div>`; that pattern was removed.)

- Which fields are required must mirror the backend DTO's `[Required]` attributes (e.g. the
  `<Entity>RequestBase` in `backend/VMCI.Scanner.WebApi/DTOs/`), so the client-side `validate()` and
  the server agree.

### 2. Save / Cancel placement

- The action buttons live in `<FormActions isSaving={isSaving} onCancel={handleCancel} />`,
  rendered **inside** the `<form>` (its `Opslaan` button is a `type="submit"` that relies on the
  form's `onSubmit`; the secondary cancel button is always labelled **`Annuleren`** app-wide).
  `FormActions` right-aligns the buttons at the bottom of the form (`d-flex justify-content-end`)
  and disables both while a save is in flight. Don't lay out form buttons manually.

### 3. All user-facing form copy is in Dutch

- **Everything the user reads on a form is Dutch**: field labels, the page heading and
  description, button captions (`Opslaan` / `Annuleren`), the loading text (`Laden...`), the
  per-field validation messages returned by `validate()` (e.g. `'Gemeente is verplicht.'`), the
  submit summary banner (`'Corrigeer de gemarkeerde velden.'`), and the `getErrorMessage(...)`
  fallbacks for a failed load/save (e.g. `'Opslaan van gegevens mislukt'`).
- `id`/`htmlFor`/state-key identifiers stay in English (they're not user-visible) — only the
  displayed strings are translated.

## Rijksregisternummer (RRN) input

**`VMCIRRNInput` (from `src/components/VMCIUIComponents`) is the default, required control for
capturing a person's Rijksregisternummer / national register number** — never a plain
`Form.Control` for that field. It live-masks as `______-___-__` while typing and always
reports the raw 11-digit string (or `null`) via `onValueChanged`, so store/send that raw value,
not the masked text. Use `isValidRrn`/`parseRrn` from the same barrel (also in
`VMCIUIComponents/rrn.ts`) for validation and for reading back the birthdate/gender it encodes,
rather than re-implementing the modulo-97 check elsewhere.

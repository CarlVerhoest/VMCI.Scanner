# VMCIUIComponents

Shared list/table/select/date-picker/spinner/action-menu/RRN-input controls, ported from the
sibling `KAZM.eSoar/frontend/src/UIComponents` project (`MyList`, `MyTable`, `MySelector`,
`MyDatePicker`, `MySpinners`, `MyActionMenu`, `RRNInputField`) and namespaced `VMCI*` here. **See the
enforcement rule in `frontend/VMCI.Scanner.App/CLAUDE.md`: these are the required components for
lists, tables, dropdown-selects, and date pickers throughout this app** — this file is the API
reference and porting rationale, not the enforcement policy itself.

Import from the barrel: `import { VMCITable, VMCITableColumn } from '@/components/VMCIUIComponents'`.

## What changed from the KAZM.eSoar originals

The source components were copied, not symlinked/vendored — there is no ongoing sync with
KAZM.eSoar. When porting, the following were deliberately changed (**apply the same standard
to yourself if you touch these files**, don't reintroduce what was removed):

- **Strict TypeScript.** VMCI.Scanner.App's `tsconfig.json` runs with `strict: true`; KAZM.eSoar's
  build config disables `strict`/`strictNullChecks` entirely. The originals relied on that
  (e.g. `private _moment: Moment = null` on a non-nullable field, functions typed to always
  return `MyDateTime` that actually `return null`). Every `VMCI*` component here compiles clean
  under full strict mode with no `any` beyond a couple of narrowly-scoped, justified spots — keep
  it that way.
- **No moment.js.** KAZM's `MyDatePicker` wraps a custom `MyDateTime`/`MyTimeSpan` class
  (`HelperClasses/MyDate.ts`) built on `moment`, which is in maintenance mode and not something
  to newly depend on. `VMCIDatePicker` instead takes a plain `value: Date | null` and uses
  `date-fns` (already an VMCI.Scanner dependency) for locale/format detection — see `dateLocale.ts`,
  a trimmed rewrite of KAZM's `LocaleHelper.ts` with the moment-only functions dropped.
- **No global FontAwesome icon registry.** KAZM's icons (`SortIcon`, filter icon, the
  `MyActionMenu` toggle and `ActionItem.icon` prop) reference icons by bare string name (e.g.
  `icon="filter"`, `icon="ellipsis-v"`), which only resolves via a global `library.add(...)`
  call this app doesn't have. `icons.tsx` here imports the specific icon objects directly
  (`faArrowUp`, `faFilterCircleXmark`, etc.) instead, and `VMCIActionMenu` imports
  `faEllipsisVertical` directly and types `VMCIActionItemProps.icon` as `IconDefinition` so
  callers pass an icon object (e.g. `faTrash`) rather than a string.
- **Bootstrap 5 utility classes.** `text-left` (a Bootstrap 4 class, silently a no-op under the
  installed Bootstrap 5) was replaced with `text-start`.
- **VMCI.Scanner theming.** All colors route through the `--scanner-*` CSS custom properties from
  `src/styles/theme.css` (row striping, dividers, `VMCISelector`'s `styles` prop, the
  `VMCIDatePicker.css` dark-mode overrides for `react-datepicker`'s otherwise-hardcoded popup
  colors, `VMCISpinner`'s `Blocks` color) instead of KAZM's hardcoded light-only hex colors, so
  light/dark mode both work.
- **Generic-safe context, no `any`.** KAZM's `MyActionMenu` types its React context as
  `React.createContext<any>(null)`. `VMCIActionMenu` uses `createContext<unknown>(null)` instead,
  with a single documented `as T` cast in the private `ActionItem` — the one narrowly-scoped spot
  referenced by the strict-TypeScript rule above, unavoidable because a generic component's type
  parameter can't be threaded through `createContext` itself.
- **No class components.** KAZM's `RRNInputField` is a `React.Component` with `constructor(props:
any)` and mutable `this.state`, out of step with every other `VMCI*` component (all function
  components). `VMCIRRNInput` is a function component; its Belgian-national-number parsing,
  validation, and masking logic (unrelated to React) moved out into pure functions in `rrn.ts`
  instead of living as private methods on the class.
- **`VMCIRRNInput` is fully controlled**, unlike KAZM's original which only reads `props.RRN`
  once, in the constructor - if the parent later resets its value (e.g. a form reset), the
  original silently keeps showing the stale input. `VMCIRRNInput` derives its masked display
  from the `value` prop on every render instead, matching how `VMCIDatePicker`/`VMCISelector`
  already work; caret position after a keystroke is restored via a `useLayoutEffect` (runs after
  React commits the re-mask) rather than the original's `await this.setState(...)` timing hack.
  `autoFocus` also became an opt-in prop (default `false`) rather than being hardcoded on the
  underlying `Form.Control` - unconditionally stealing focus on mount isn't safe to assume for
  every place this can now be used.
- **Dependency versions.** `@tanstack/react-table` is pinned to `8.21.3` (same version
  KAZM.eSoar runs) rather than the `9.x` line currently on npm — v9 is a significant internal
  rewrite ("table features" architecture) that wasn't worth the migration risk for a ported,
  hard-to-fully-runtime-test component; re-evaluate if a real need for v9 shows up.
  `clsx`, `react-datepicker`, `react-select`, and `react-loader-spinner` are at latest.

## Component summaries

- **`VMCITable<T>`** — searchable (global text filter across all columns by default),
  sortable, client-side-paginated grid, built on `@tanstack/react-table`. Give it the full
  dataset in one shot (see the "Loading Data" section in the parent `CLAUDE.md`); it does not
  fetch or page server-side. Columns take either `accessorKey` (a `keyof T`) or a custom
  `accessorFn`; override `cell`/`filterFn`/`sortingFn` per column as needed. `rowClassName`
  lets a caller add a class per row (e.g. de-emphasizing closed/archived records).

  **Row selection is built in, not opt-in** - every `VMCITable` everywhere already has it, there
  is no prop to enable it and no per-page wiring needed. A single click (or the first click of a
  double-click, or Up/Down while the table has focus) highlights that row
  (`.scanner-uicontrol-row-selected`, a stronger tint than the alternating-row stripe -
  `--scanner-selection-bg` in `theme.css`); double-click additionally fires `onRowDoubleClick`
  when the caller passed one. Selection is keyed by TanStack's `row.id` (stable across
  sort/filter/page, unlike display position), so it follows the same underlying record if the
  user re-sorts rather than resetting. Arrow-key navigation only moves within the current
  page/sort/filter state and clamps at the first/last visible row - it never flips pages.
  A column's `className`/`headerClassName` is **merged** with (not a replacement for) the
  default cell classes (`text-start text-truncate my-auto`) - a column that only wants a
  responsive show/hide class just needs e.g. `d-none d-lg-block`, nothing else. (This wasn't
  always true - earlier versions replaced instead of merged, which silently dropped
  `text-truncate`/`my-auto` off any column with a custom className, producing top-aligned cells
  next to properly centered ones. If you see a `const CELL = 'text-start text-truncate my-auto'`
  + `` `${CELL} d-none d-lg-block` `` construction anywhere, it's a leftover workaround for that
  and can be simplified back to the bare responsive class.)

  **Pattern: action column.** Every list with a "new record" button + per-row `VMCIActionMenu`
  follows the same
  shape - put it last in the `columns` array and set `fitContent: true` on it:

  ```tsx
  {
    id: 'actions',
    accessorFn: () => null,          // no underlying field
    enableSorting: false,
    enableFiltering: false,
    fitContent: true,                // col-auto + centered content, hugs the right edge
    header: () => <Button ...><FontAwesomeIcon icon={faPlus} /></Button>,
    cell: (row) => (
      <VMCIActionMenu dataObject={row}>
        <VMCIActionMenu.Item label="Bewerken" icon={faPenToSquare} onClick={...} />
      </VMCIActionMenu>
    ),
  }
  ```

  `fitContent` sizes that column to its content (Bootstrap's `col-auto`) instead of sharing
  flex-grow equally with the data columns (the default `col`), and centers its content
  horizontally. Because every other column stays a plain `col`, they absorb the row's remaining
  width between them - that's the "at least one other column fills remaining space" half of the
  layout, and it falls out of Bootstrap's flex-grid defaults for free, nothing to opt into.
  Don't reach for `flex-grow-1`/`w-100` on the data columns to achieve this - just leave them as
  the unstyled default `col` and let `fitContent` do the opposite (opt the action column *out*).

  `fitContent` columns also automatically skip `text-truncate` (they get `my-auto` only, not the
  full text-oriented default) - a control column holds a fixed-size widget, not truncatable
  text, and `text-truncate`'s `overflow: hidden` would otherwise clip the action menu's dropdown
  popup so it silently never becomes visible. No need to pass your own `className` to get this;
  don't add `text-truncate` back onto a `fitContent` column.
- **`VMCIList<T>`** — the same column-definition shape without sorting/filtering/paging, for
  small static datasets or label/value-style layouts.
- **`VMCISelector<T>`** — wraps `react-select`. Pass `options: T[]`, a `valueLabel` (property
  name or function) to derive display labels, and `onValueChanged` — it manages the
  value/option-object mapping internally so callers work in terms of their own domain type `T`,
  never `react-select`'s internal `{ value, label }` shape.
- **`VMCIDatePicker`** — wraps `react-datepicker` with a plain `Date | null` value and
  locale-aware formatting/placeholder text derived from the browser's locale.
- **`VMCISpinner`** — wraps `children` and overlays a `react-loader-spinner` `Blocks` spinner
  plus a dimming backdrop over them while `active` is true. The backdrop covers the content; the
  spinner itself is `position: fixed` in the middle of the **viewport**, not of the backdrop — centred
  in the backdrop it sat halfway down a long page, out of sight (fixed 14/09/2026, seen on a long
  assistant conversation). `App.tsx` already wraps the whole
  routed app in one, driven by `src/hooks/useHttpActivity.ts` — see the "Global loading
  spinner" section in the parent `CLAUDE.md` before using `VMCISpinner` directly on a page, and
  before adding a second spinner anywhere (this is the one place that renders one).
- **`VMCIActionMenu<T>`** — a per-row "..." dropdown (compound component, like `Dropdown.Item`).
  Pass the row's `dataObject`; each `<VMCIActionMenu.Item icon={faTrash} label="Delete"
onClick={(dataObject) => ...} />` child receives it back typed as `T`, so callers don't have
  to close over the row themselves.
- **`VMCIRRNInput`** — the default control for entering a Belgian Rijksregisternummer (national
  register number). `value`/`onValueChanged` are always the raw 11-digit string (or `null`),
  never the masked display text - it shows as `______-___-__` while typing. Pair it with
  `rrn.ts`'s `isValidRrn`/`parseRrn` (also exported from the barrel) for validation and for
  reading back the encoded birthdate/gender.

## Files

- `VMCIList.tsx`, `VMCITable.tsx`, `VMCISelector.tsx`, `VMCIDatePicker.tsx`, `VMCISpinner.tsx`,
  `VMCIActionMenu.tsx`, `VMCIRRNInput.tsx` — the seven public components.
- `icons.tsx` — `SortIcon`/`ClearFilterIcon`, internal to `VMCITable`.
- `dateLocale.ts` — locale/date-format helpers, internal to `VMCIDatePicker`.
- `rrn.ts` — Rijksregisternummer parsing/validation/masking, internal to `VMCIRRNInput` (its
  `isValidRrn`/`parseRrn`/`RRN_MASK` etc. are still exported from the barrel for callers that
  need to validate or read a value independently of the input itself).
- `VMCIDatePicker.css` — dark-mode overrides for `react-datepicker`'s popup calendar.
- `index.ts` — barrel export; import from here, not the individual files.

# Migratie naar `Table`

## Vervangt

| Project | Oud pad | Oude naam | Bronversie |
| ------- | ------- | --------- | ---------- |
| Claudine | `src/components/VMCIUIComponents/VMCITable.tsx` (+ `icons.tsx`) | `VMCITable` (19×) | `fce4a94` |
| LevelUp | idem | `VMCITable` (4×) | `4dfb97d` |
| VMCI.Scanner | idem | `VMCITable` (2×) | `4400de4` |
| KAZM.eSoar | `src/UIComponents/MyTable.tsx` | `MyTable` (8×) | `dc29d9a` |
| eLogger | `FlightLogbook` (inline `<table>`, sorteerbare `<th>`, `Pagination`) | — | `1e94deb` |
| VMCI | `ExpenseRow`/`CurrencyRow`/`CustomerRow` + `*Card` (rij op desktop, card op mobiel) | — | `4da8795` |

## Gebruik vinden

```text
regex: \b(VMCITable|MyTable)\b
regex: <Table\b[^>]*(striped|hover)|<thead|<Pagination\b
regex: claudine-uicontrol-|level-up-uicontrol-|scanner-uicontrol-
```

## Prop-mapping (VMCITable → Table)

| Oud | Nieuw | Omzetting |
| --- | ----- | --------- |
| `data`, `columns`, `enableFiltering`, `enableSorting`, `pageSize`, `rowClassName`, `toolbarStart`, `onRowClick`, `onRowDoubleClick`, `enableColumnResizing` | idem | 1-op-1 |
| `initialSorting: SortingState` | `initialSorting: { id, desc }[]` | dezelfde vorm, zonder TanStack-type |
| `emptyStateText` | `labels={{ empty }}` of `emptyState={<EmptyState …/>}` | Standaard "Geen gegevens"; bij een zoekterm zonder resultaat "Niets gevonden voor deze zoekterm". |
| `columnWidthsStorageKey` (optioneel; anders afgeleid van de URL) | `columnWidthsStorageKey` | **Zonder sleutel worden breedtes niet meer bewaard.** Geef per tabel een vaste naam mee, bv. `"dossier-werknemers"`, om het oude gedrag te behouden. De opgeslagen breedtes van Claudine (prefix `claudine-column-widths:`) worden niet overgenomen: gebruikers stellen ze één keer opnieuw in. |
| — | `rowKey` | **Aanbevolen**, bv. `rowKey="id"`. De selectie volgt dan het record, ook na het opnieuw laden van de data. |
| — | `selectedRow` + `onSelectionChanged` | nieuw: selectie lezen en sturen |
| — | `pageSizeOptions` | nieuw, bv. `[10, 25, 0]` (`0` is alles) |
| — | `cardBreakpoint` (standaard `md`) | Nieuw: op mobiel cards. `false` behoudt altijd rijen. |
| Kolom: `id`, `header`, `accessorKey`/`accessorFn`, `cell`, `enableSorting`, `enableFiltering`, `sortingFn`, `filterFn`, `onClick`, `className`, `headerClassName`, `fitContent` | idem | 1-op-1 |

## KAZM: MyTable

| Oud | Nieuw |
| --- | ----- |
| kolom `header: string \| () => JSX \| null` | `header: string \| () => ReactNode` (`null` wordt `''`) |
| kolom `cell?: (o: T \| null, rowIndex) => …` | `cell?: (row: T, displayIndex) => …` (nooit `null`) |
| `sortingFn(v1, v2, o1, o2, colId)` | `sortingFn(v1, v2, row1, row2)` (zonder `colId`) |
| `pageSize` (standaard 10) | `pageSize` (standaard **20**): geef `10` mee om het oude gedrag te behouden |
| knoppen "Vorige"/"Volgende" + "Page x of y" | pagination met vensters (eerste, vorige, nummers, volgende, laatste) |
| zebrastrepen met hardgecodeerde `#ebf5fb` | token `--vmci-stripe-bg` |

**Opgelost (KAZM):** na sorteren of filteren klopten de zebrastrepen niet meer, omdat ze `row.index` gebruikten.

## Gedragswijzigingen

- **Sorteren:** de eerste klik sorteert **altijd oplopend**. Vroeger sorteerde TanStack getalkolommen eerst aflopend.
- **Sorteren met het toetsenbord:** de kopregel is nu een knop.
- **A11y:**
  - `role="grid"` met `aria-sort`, `aria-selected` en `aria-activedescendant`;
  - ↑/↓ verplaatst de selectie, en Enter opent de geselecteerde rij (`onRowDoubleClick`, anders `onRowClick`).
- **Zoekveld:** dit is de `SearchInput` met een echte wisknop. "Kolombreedtes herstellen" is een knop.
- **Kolommen** die je verbergt met `className: 'd-none d-lg-block'` blijven ook in de card-layout verborgen.
- **CSS:** `claudine-uicontrol-*` / `level-up-*` / `scanner-*` worden `vmci-data__*`. Verwijder de oude regels uit de app.

## Voorbeeld

```tsx
// oud
<VMCITable data={employees} columns={columns} emptyStateText="Geen werknemers" onRowDoubleClick={open} />
// nieuw
<Table aria-label="Werknemers" data={employees} columns={columns} rowKey="id"
       labels={{ empty: 'Geen werknemers' }} columnWidthsStorageKey="dossier-werknemers" onRowDoubleClick={open} />
```

## eLogger en VMCI: zelfgebouwde tabellen en cards

Vervang de combinatie van `<table>` op desktop en cards op mobiel door één `Table`. Verwijder daarbij de theme-specifieke klassen (`table-dark`, `bg-dark` op basis van `useTheme()`). **Behoud functionaliteit:**
- **Server-side paginering** (eLogger `PagedResult`) wordt **nog niet** ondersteund: dat staat op "later". Laat die lijst voorlopig staan, of laad alles in één keer als het aantal klein is.
- **Vegen om te verwijderen** in de mobiele lijst: geef `onRowSwipeDelete={vraagBevestiging}` mee (vanaf 1.2.0). Elke card wordt dan een `SwipeToDelete`; VMCI veegde naar rechts tot 50 %: `swipeDeleteDirection="right" swipeDeleteThreshold={0.5}`. Houd een verwijderknop of menu-item in een kolom voor muis en toetsenbord. Rond een List wikkel je de cards zelf in `SwipeToDelete` (zie SwipeToDelete/MIGRATION.md).

## Controlelijst

- [ ] Alle `VMCITable`s en `MyTable`s zijn vervangen; `rowKey` is gezet
- [ ] `columnWidthsStorageKey` is gezet waar breedtes onthouden moeten worden
- [ ] Het sorteergedrag is gecontroleerd (eerste klik oplopend)
- [ ] Gecontroleerd op mobiel (cards, sorteerkeuze) en desktop (rijen, breedtes)
- [ ] De oude CSS-klassen voor rijen en strepen zijn verwijderd
- [ ] Typecheck, build en tests van de app slagen

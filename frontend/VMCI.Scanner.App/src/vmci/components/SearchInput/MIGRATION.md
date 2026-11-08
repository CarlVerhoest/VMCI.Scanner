# Migratie naar `SearchInput`

## Vervangt

| Project | Oud pad | Oude naam | Bronversie |
| ------- | ------- | --------- | ---------- |
| KAZM.eSoar | `src/UIComponents/FilterControl.tsx` | `FilterControl` (4×, waaronder in MyTable) | `dc29d9a` |
| Claudine, LevelUp, Scanner | `VMCITable.tsx` (intern) | zoekveld + `InputGroup.Text role="button"` | zie Table (stap 5) |
| alle | — | zelfgebouwde zoekvelden boven lijsten | — |

Het zoekveld in de Table wordt bij de migratie van de Table (stap 5) automatisch SearchInput. Voor de Table hoef je hier niets te doen.

## Gebruik vinden

```text
regex: \bFilterControl\b
regex: type=["']search["']
```

## Prop-mapping (KAZM FilterControl)

| Oud | Nieuw | Omzetting |
| --- | ----- | --------- |
| `value: string` | `value: string` | 1-op-1. Gebruik `''` in plaats van `null`. |
| `onChangeCapture?: (v: string \| null) => void` (leeg geeft `null`) | `onValueChanged: (v: string) => void` (leeg geeft `''`) | Bewaarde de app `null`, gebruik dan `onValueChanged={(v) => setFilter(v \|\| null)}` en `value={filter ?? ''}`. |
| `size?: 'sm' \| 'md' \| 'lg'` | `size?: 'sm' \| 'lg'` | `md` laat je weg |
| `autoFocus?: boolean` | `autoFocus` | 1-op-1 (gewoon input-attribuut) |
| placeholder `"filter ..."` (hardcoded) | `placeholder` of `labels.placeholder` (standaard "Zoeken…") | |
| wis-icoon (`InputGroup.Text onClickCapture`, niet bereikbaar met het toetsenbord) | echte knop "Zoekterm wissen", plus Escape | |
| `type="input"` (ongeldig) | `type="search"` | |

## Voorbeeld

```tsx
// oud
<FilterControl value={this.state.filter} size="sm" onChangeCapture={(v) => this.setState({ filter: v })} />
// nieuw
<SearchInput value={this.state.filter ?? ''} size="sm" onValueChanged={(v) => this.setState({ filter: v || null })} />
```

## Controlelijst

- [ ] Alle `FilterControl`s zijn vervangen; de omgang met `null` is gecontroleerd
- [ ] Het veld heeft een naam: standaard "Zoeken", of via een `FormField`-label of `aria-label`
- [ ] Typecheck en build van de app slagen

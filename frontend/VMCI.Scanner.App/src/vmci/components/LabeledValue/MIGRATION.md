# Migratie naar `LabeledValue`

## Vervangt

| Project | Waar | Oud | Bronversie |
| ------- | ---- | --- | ---------- |
| eLogger | `src/components/Profile.tsx` (~7×) | `<small className="text-muted fw-bold">First Name</small><span className="fs-6">{value \|\| "Not set"}</span>` | `1e94deb` |
| alle | detailpagina's | label en waarde in een `Row`/`Col` of `small` + `span` | — |

## Gebruik vinden

```text
regex: \|\|\s*["'](Not set|Niet ingevuld|-|—)["']
regex: <small[^>]*text-muted[^>]*>
```

## Mapping

| Oud | Nieuw |
| --- | ----- |
| label in `<small className="text-muted fw-bold">` | `label="…"` |
| `{value \|\| "Not set"}` | `children={value}`: een lege waarde toont `labels.empty` (standaard "Niet ingevuld"; Engels via `enLabels`: "Not set") |
| label boven de waarde | `layout="stacked"` (standaard) |
| label links, waarde rechts | `layout="inline"`; op mobiel toch onder elkaar. De breedte van het label stel je in met `--vmci-labeled-value-label-width`. |

**Gedragswijziging:** `{value || 'Not set'}` toonde ook "Not set" bij `0`. LabeledValue toont `0` wel. Alleen `null`, `undefined` en `''` gelden als leeg. Wil je ook `0` als leeg tonen, geef dan zelf `value || null` mee.

## Voorbeeld

```tsx
// oud
<div className="mb-3">
  <small className="text-muted fw-bold d-block">First Name</small>
  <span className="fs-6">{profileData.firstName || 'Not set'}</span>
</div>
// nieuw
<LabeledValue label="First Name" className="mb-3">{profileData.firstName}</LabeledValue>
```

## Controlelijst

- [ ] De label-waardeparen zijn vervangen
- [ ] Het gedrag bij `0` en lege waarden is gecontroleerd
- [ ] Typecheck en build van de app slagen

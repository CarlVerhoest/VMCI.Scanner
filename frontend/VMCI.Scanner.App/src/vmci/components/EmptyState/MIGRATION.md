# Migratie naar `EmptyState`

## Vervangt

| Project | Waar | Oud | Bronversie |
| ------- | ---- | --- | ---------- |
| eLogger | `FlightLogbook`, `AircraftList`, `Statistics`, `StatsPerAircraftType` | inline: groot FA-icoon (`fa-3x`), `<h5 className="text-muted">`, tekst en een CTA-knop | `1e94deb` |
| alle | lijsten en pagina's | inline "Geen gegevens", "No … found" | — |

De lege toestand **binnen** Table en List (`emptyStateText`) verhuist met de migratie van die componenten (stap 5). Die gebruiken intern EmptyState.

## Gebruik vinden

```text
regex: No .* found|Geen .* gevonden|Geen gegevens|Nog geen
regex: fa-3x|fa-4x
```

## Mapping

| Oud | Nieuw |
| --- | ----- |
| `<i className="fas fa-plane fa-3x text-muted mb-3" />` | `icon={faPlane}`: importeer het icoon (geen FA CSS-class meer) |
| `<h5 className="text-muted">No aircraft found</h5>` | `title="No aircraft found"` (of de standaard `labels.title`) |
| `<p className="text-muted mb-4">Add your first aircraft…</p>` | `children` |
| `<Button onClick={…}>Add Aircraft</Button>` | `action={<Button …>Add Aircraft</Button>}` |
| `<h5>` | `headingLevel` (standaard `3`). Kies het niveau dat in de structuur van de pagina past. |
| compact, in een tabel | `size="sm"` |

## Voorbeeld

```tsx
// oud
<div className="text-center py-5">
  <i className="fas fa-plane fa-3x text-muted mb-3"></i>
  <h5 className="text-muted">No aircraft found</h5>
  <p className="text-muted mb-4">Add your first aircraft to get started.</p>
  <Button variant="primary" onClick={() => navigate('/aircraft/new')}>Add Aircraft</Button>
</div>
// nieuw
<EmptyState
  icon={faPlane}
  title="No aircraft found"
  action={<Button variant="primary" onClick={() => navigate('/aircraft/new')}>Add Aircraft</Button>}
>
  Add your first aircraft to get started.
</EmptyState>
```

## Controlelijst

- [ ] De inline lege toestanden zijn vervangen
- [ ] De iconen komen uit `@fortawesome/free-solid-svg-icons`, niet uit FA CSS-classes
- [ ] Het headingniveau past in de pagina
- [ ] Typecheck en build van de app slagen

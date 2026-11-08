# Migratie naar `LoadingState`

Vervangt de verschillende manieren om "aan het laden" te tonen **in plaats van** inhoud, dus niet als overlay. Voor de overlay gebruik je `Spinner`.

## Vervangt

| Project | Waar | Oud | Bronversie |
| ------- | ---- | --- | ---------- |
| eLogger | `src/App.tsx` | `PageLoader` (Suspense-fallback, 4×) | `1e94deb` |
| eLogger | `ProtectedRoute`, `FlightLogbook`, `AircraftList`, `AircraftForm`, `Statistics` | inline `<Spinner animation="border" />` + tekst, elk met andere markup | `1e94deb` |
| alle | waar dan ook | `<div className="text-center"><Spinner …/> Laden…</div>` | — |

## Gebruik vinden

```text
regex: <Spinner\s+animation=
regex: \bPageLoader\b
regex: spinner-border
```

Controleer elk resultaat. Een spinner **in een knop** (bv. "Bezig met opslaan…") blijft zoals hij is: dat is geen LoadingState.

## Prop-mapping

| Oud | Nieuw |
| --- | ----- |
| `<Spinner animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner>` | `<LoadingState hideLabel />` |
| spinner + zichtbare tekst ("Loading eLogger...", "Laden...") | `<LoadingState labels={{ loading: 'Loading eLogger…' }} />` |
| `minHeight: 200px` / gecentreerd op de pagina | `size="lg"` (min. 40vh) |
| kleine spinner in een card of tabel | `size="sm"` |

Engelstalige apps (eLogger, VMCI) zetten de tekst één keer voor de hele app met `<VMCIProvider labels={enLabels}>`.

## Voorbeeld

```tsx
// oud (eLogger App.tsx)
const PageLoader = () => (
  <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '200px' }}>
    <Spinner animation="border" role="status"><span className="visually-hidden">Loading...</span></Spinner>
  </div>
)
<Suspense fallback={<PageLoader />}>
// nieuw
<Suspense fallback={<LoadingState size="lg" hideLabel />}>
```

## Controlelijst

- [ ] `PageLoader` en de inline laad-blokken zijn vervangen
- [ ] De spinners in knoppen zijn ongemoeid gelaten
- [ ] Teksten gecontroleerd (Nederlands standaard, Engels via `enLabels`)
- [ ] Typecheck en build van de app slagen

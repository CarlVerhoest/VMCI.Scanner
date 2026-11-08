# Migratie naar `StatusChip`

## Vervangt

| Project | Oud pad / waar | Oude naam | Bronversie |
| ------- | -------------- | --------- | ---------- |
| Claudine | `src/components/workflow/WorkflowBits.tsx` | `StateChip` + CSS `.claudine-state--*` | `fce4a94` |
| eLogger | `Statistics` | inline `Badge` bij een vervaldatum (danger, warning of success volgens de datum) | `1e94deb` |
| alle | — | `<span className="badge bg-…">` als status | — |

**Niet vervangen:** `TrafficLightIcon` en `ColouredBallsIcon` in KAZM. Dat zijn domeinspecifieke iconen, geen status-pillen. Ze blijven voorlopig in KAZM.

## Gebruik vinden

```text
regex: \bStateChip\b
regex: claudine-state--
regex: className="badge (bg|text-bg)-
```

## Mapping (Claudine StateChip)

`StateChip` gebruikte workflowtoestanden. Dat is domeinkennis. Zet die om naar een `tone` in een kleine helper **in de app**:

```tsx
// app: src/components/workflow/stateTone.ts
import type { StatusTone } from '@vmci/ui'
export const stateTone: Record<WorkflowState, StatusTone> = {
  done: 'success',
  partial: 'warning',
  signal: 'danger',
  none: 'neutral',
  notByUs: 'neutral',
  notBuilt: 'neutral',
  override: 'info',
}
// oud
<StateChip state={row.state}>{label}</StateChip>
// nieuw
<StatusChip tone={stateTone[row.state]}>{label}</StatusChip>
```

| Oud | Nieuw | Opmerking |
| --- | ----- | --------- |
| `.claudine-state--done` | `tone="success"` | dezelfde kleuren (`--bs-success-bg-subtle` / `-text-emphasis`) |
| `--partial` | `tone="warning"` | |
| `--signal` | `tone="danger"` | |
| `--none`, `--notByUs` | `tone="neutral"` | |
| `--notBuilt` (gestreepte achtergrond) | `tone="neutral"` + `className="claudine-state--notBuilt"` | **Functionaliteit behouden:** het streeppatroon is app-specifiek. Houd die ene CSS-regel in de app. |

## Mapping (badges)

| Oud | Nieuw |
| --- | ----- |
| `<Badge bg="danger">Expired</Badge>` | `<StatusChip tone="danger" solid>Expired</StatusChip>` |
| `<Badge bg="success-subtle" text="success-emphasis">` | `<StatusChip tone="success">` |
| alleen kleur als signaal | voeg `icon` toe (bv. `faCircleExclamation`), zodat kleur niet het enige signaal is (D9) |

Een badge die **geen** status is (een teller, een label zoals "ICAO"), blijft een Bootstrap-`Badge`.

## Controlelijst

- [ ] `StateChip` is vervangen; de mapping van toestand naar tone staat in de app
- [ ] De CSS-regels voor `.claudine-state--*` zijn verwijderd, behalve app-specifieke patronen
- [ ] Statusbadges zijn omgezet; tellers en labels zijn ongemoeid gelaten
- [ ] Typecheck en build van de app slagen; visueel gecontroleerd in light en dark

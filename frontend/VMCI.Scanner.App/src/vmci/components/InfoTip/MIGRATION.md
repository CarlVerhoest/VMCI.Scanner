# Migratie naar `InfoTip`

## Vervangt

| Project | Oud pad | Oude naam | Bronversie |
| ------- | ------- | --------- | ---------- |
| KAZM.eSoar | `src/UIComponents/InfoOverlay.tsx` | `InfoOverlay` (14×) | `dc29d9a` |

## Gebruik vinden

```text
regex: \bInfoOverlay\b
```

## Import

```tsx
// oud
import { InfoOverlay } from '../UIComponents/InfoOverlay'
// nieuw
import { InfoTip } from '@vmci/ui'
```

## Prop-mapping

| Oud | Nieuw | Omzetting |
| --- | ----- | --------- |
| `tooltip: string \| JSX.Element` | `content: ReactNode` | 1-op-1, alleen de naam verandert |
| `iconName?: any` (string, standaard `'info-circle'`) | `icon?: IconDefinition` (standaard `faCircleInfo`) | String naar import, bv. `'question-circle'` wordt `faCircleQuestion` |
| `placement` vast op `auto` | `placement?` (standaard `auto`) | — |
| kleur `#343a40` (hardcoded) | `--vmci-text-muted`, en `--vmci-accent` bij hover of open | volgt het thema |

## Gedragswijzigingen

| Oud | Nieuw |
| --- | ----- |
| touch: alleen bij focus; desktop: klik + hover | overal: hover en focus tonen, een klik of tik pint open of dicht, en Escape of een klik elders sluit |
| `<span tabIndex={0}>` zonder naam | echte `<button>` met `aria-label` "Meer informatie" (via `labels`), en `aria-describedby` naar de tooltip |
| focusrand verwijderd (`outline: none`) | **zichtbare focusring** (D9) |
| vaste `id="button-tooltip"` (dubbele id's) | unieke id per instantie |

## Voorbeeld

```tsx
// oud
<InfoOverlay tooltip="Vul je GSM-nummer in met landcode." />
// nieuw
<InfoTip content="Vul je GSM-nummer in met landcode." />
```

## Controlelijst

- [ ] Alle `InfoOverlay`s zijn vervangen; `iconName`-strings zijn omgezet naar imports
- [ ] Getest op touch (tik opent en sluit) en met het toetsenbord (Tab toont, Escape sluit)
- [ ] Typecheck en build van de app slagen

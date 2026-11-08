# Migratie naar `Spinner` en `useHttpActivity`

## Vervangt

| Project | Oud pad | Oude naam | Bronversie |
| ------- | ------- | --------- | ---------- |
| KAZM.eSoar | `src/UIComponents/MySpinners.tsx` | `BlocksSpinner` (37×) | `dc29d9a` |
| Claudine | `src/components/VMCIUIComponents/VMCISpinner.tsx` | `VMCISpinner` | `fce4a94` |
| LevelUp | `src/components/VMCIUIComponents/VMCISpinner.tsx` | `VMCISpinner` | `4dfb97d` |
| VMCI.Scanner | `src/components/VMCIUIComponents/VMCISpinner.tsx` | `VMCISpinner` | `4400de4` |
| Claudine, LevelUp, Scanner | `src/hooks/useHttpActivity.ts` | `useHttpActivity`, `beginHttpRequest`, `endHttpRequest` | zie boven |

## Gebruik vinden

```text
regex: \b(BlocksSpinner|VMCISpinner)\b
regex: from ['"].*hooks/useHttpActivity['"]
regex: from ['"].*MySpinners['"]
```

## Import

```tsx
// oud
import { VMCISpinner } from './components/VMCIUIComponents'
import { BlocksSpinner } from './UIComponents/MySpinners'
import { useHttpActivity } from './hooks/useHttpActivity'
// nieuw
import { Spinner, useHttpActivity, beginHttpRequest, endHttpRequest } from '@vmci/ui'
```

## Prop-mapping

| Oud | Nieuw | Omzetting |
| --- | ----- | --------- |
| `active: boolean` | `active` | 1-op-1 |
| `children: ReactNode` / KAZM: `children: JSX.Element` (precies één element) | `children?: ReactNode` | 1-op-1. KAZM: meerdere children mogen nu ook. |
| — | `variant?: 'blocks' \| 'border'` | Standaard `blocks`, dus hetzelfde uitzicht als vroeger. |
| kleur `var(--claudine-accent)` / `--level-up-accent` / `--scanner-accent` / KAZM `#4fa94d` | token `--vmci-accent` | **Let op:** react-loader-spinner `Blocks` negeerde de `color`-prop, dus de oude spinner was in **alle** apps blauw (`#577c9b`/`#0dceff`). De nieuwe blokjes zijn CSS en volgen echt het accent van de app. |
| achtergrond `rgba(0,0,0,.5)` / KAZM `rgba(50,50,50,.5)` | token `--vmci-backdrop` | Instelbaar per app en per thema. |
| z-index 9999/10000 | `--vmci-zindex-busy` (standaard 1080) | Boven modals (1055), onder toasts (1090). Wil de app het oude gedrag terug, zet dan `--vmci-zindex-busy: 9999` in de app-tokens. |

## Gedragswijzigingen

- **De inhoud wordt `inert` zolang de spinner actief is.** Vroeger blokkeerde alleen de muis, en kon je nog met Tab en Enter in de inhoud werken. Dat kan nu niet meer. Dat is bedoeld.
- Er is `role="status"` met een tekst voor schermlezers (`labels.busy`, standaard "Bezig met laden…").
- De wrapper heeft `aria-busy` en geeft `className`, `id` en andere attributen door.
- **KAZM:** het overlay staat over de inhoud. De spinner staat nu in het midden van de **viewport**, niet van de inhoud. Op lange pagina's blijft hij zo zichtbaar.

## useHttpActivity

Het gedrag is identiek aan de hooks in Claudine, LevelUp en Scanner. Vervang alleen de imports:

```ts
// services/axiosConfig.ts
import { beginHttpRequest, endHttpRequest } from '@vmci/ui'
```

Behoud de app-logica die bepaalt welke requests meetellen (Claudine `quiet: true`, LevelUp `background: true`) in de interceptors van de app. Verwijder daarna `src/hooks/useHttpActivity.ts`.

**KAZM** heeft geen globale teller: elke pagina gebruikt `<BlocksSpinner active={this.state.isLoading}>`. Dat blijft werken: vervang alleen de naam. Een globale spinner is een aparte, optionele verbetering.

## Voorbeeld

```tsx
// oud
<VMCISpinner active={useHttpActivity()}>
  <AppRoutes />
</VMCISpinner>
// nieuw
<Spinner active={useHttpActivity()}>
  <AppRoutes />
</Spinner>
```

## Controlelijst

- [ ] Alle `BlocksSpinner`/`VMCISpinner` zijn vervangen (zoekpatronen geven 0 resultaten)
- [ ] De imports van `useHttpActivity`/`beginHttpRequest`/`endHttpRequest` komen uit `@vmci/ui`; de oude hook is verwijderd
- [ ] Het accent van de app staat in de app-tokens (de spinner krijgt nu die kleur in plaats van blauw)
- [ ] `react-loader-spinner` is uit de app verwijderd als het nergens anders gebruikt wordt
- [ ] Visueel gecontroleerd: een spinner tijdens het opslaan in een modal bedekt ook de modal
- [ ] Typecheck, build en tests van de app slagen

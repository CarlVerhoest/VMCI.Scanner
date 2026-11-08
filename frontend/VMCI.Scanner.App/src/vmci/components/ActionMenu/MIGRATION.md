# Migratie naar `ActionMenu`

## Vervangt

| Project | Oud pad | Oude naam | Bronversie |
| ------- | ------- | --------- | ---------- |
| Claudine | `src/components/VMCIUIComponents/VMCIActionMenu.tsx` | `VMCIActionMenu` (6×) | `fce4a94` |
| LevelUp, VMCI.Scanner | idem | `VMCIActionMenu` (0× / 1×) | zie inventaris |
| KAZM.eSoar | `src/UIComponents/MyActionMenu.tsx` | `MyActionMenu` (9×) | `dc29d9a` |

## Gebruik vinden

```text
regex: \b(VMCIActionMenu|MyActionMenu)(\.Item)?\b
```

## Prop-mapping

| Oud | Nieuw | Omzetting |
| --- | ----- | --------- |
| `dataObject` | idem | `null` werkt nu ook (vroeger: een fout) |
| `color?: string` (kleur van het icoon) | `className` met een `text-*`-klasse | Hardgecodeerde kleuren zijn niet toegestaan. Gebruik bv. `className="text-primary"`. |
| — | `aria-label` | **Aanbevolen:** een specifieke naam, bv. "Acties voor OO-ABC". Standaard is het "Acties". |
| `Item`: `label`, `disabled`, `hidden`, `onClick(dataObject)` | idem | |
| `Item`: `icon: IconDefinition` (Claudine) | `icon?` | optioneel |
| `Item`: `icon: string` (KAZM) | `icon?: IconDefinition` | String naar import: `'pencil-alt'` wordt `faPen`, `'trash'` wordt `faTrash` |
| — | `Item`: `danger` | nieuw: rode tekst voor verwijderen |

**TypeScript:** `ActionMenu.Item` kan het type van `dataObject` niet uit het omringende menu afleiden. Annoteer daarom de parameter: `onClick={(row: Employee) => edit(row)}`.

**Opgelost:**
- De toggle had geen toegankelijke naam.
- De afstand tussen icoon en tekst was `&nbsp;&nbsp;`.
- KAZM: de context had het type `any`.

## Controlelijst

- [ ] Alle menu's zijn vervangen; `color` is omgezet naar een klasse
- [ ] De toggles hebben een specifieke `aria-label` waar er meerdere op een pagina staan
- [ ] Typecheck, build en tests van de app slagen

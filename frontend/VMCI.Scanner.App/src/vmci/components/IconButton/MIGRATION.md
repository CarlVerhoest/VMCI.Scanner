# Migratie naar `IconButton` en `AddButton`

## Vervangt

| Project | Oud pad / waar | Oude naam | Bronversie |
| ------- | -------------- | --------- | ---------- |
| KAZM.eSoar | `src/UIComponents/AddButton.tsx` | `AddButton` (16×) | `dc29d9a` |
| VMCI | `ExpenseRow`, `CurrencyRow`, `CustomerRow` | `<button className="btn btn-sm …" title="Edit"><FontAwesomeIcon icon={faEdit} /></button>` | `4da8795` |
| eLogger | `Profile` (32×32 bewerken), lijsten | inline knoppen met alleen een icoon | `1e94deb` |
| alle | — | `<span onClick>` of `<div onClick>` met een icoon | — |

## Gebruik vinden

```text
regex: \bAddButton\b
regex: <(span|div|i)[^>]*onClick[^>]*>\s*<FontAwesomeIcon
regex: <button[^>]*>\s*<FontAwesomeIcon[^>]*/>\s*</button>
```

## AddButton (KAZM)

```tsx
// oud
import { AddButton } from '../UIComponents/AddButton'
<AddButton onClick={this.handleAdd} listenToKeyboard />
// nieuw
import { AddButton } from '@vmci/ui'
<AddButton onClick={this.handleAdd} keyboardShortcut />
```

| Oud | Nieuw | Omzetting |
| --- | ----- | --------- |
| `onClick: () => void` | `onClick` | Een handler zonder argument werkt ongewijzigd. De nieuwe krijgt een gewoon klik-event, ook bij de sneltoets. |
| `listenToKeyboard?: boolean` | `keyboardShortcut?: boolean` | Dezelfde toetsen: `+`, `p` en `P`, niet tijdens het typen in een veld. **Nieuw:** werkt niet met Ctrl, Alt of Cmd, en niet als de knop `disabled` is. |
| `className` (standaard `text-secondary`) | `className` (standaard `text-success`) | Het icoon was hardcoded `green`. Nu volgt het `text-success`. Met een andere `text-*`-klasse kies je zelf. |
| icoon `"plus-square"` (string, FA CDN) | `faSquarePlus` (vast) | Geen string-iconen meer. |
| `<span>` (niet focusbaar) | echte `<button>` met `aria-label` "Toevoegen" | Werkt nu ook met het toetsenbord. Een andere tekst kan via `labels={{ label: 'Lid toevoegen' }}`. |

## IconButton

```tsx
// oud (VMCI)
<button className="btn btn-sm btn-outline-primary" title="Edit" onClick={() => onEdit(expense)}>
  <FontAwesomeIcon icon={faEdit} />
</button>
// nieuw
<IconButton icon={faPen} label="Edit" variant="outline-primary" size="sm" onClick={() => onEdit(expense)} />
```

| Oud | Nieuw |
| --- | ----- |
| `title="…"` als enige tekst | `label="…"`: wordt zowel `aria-label` als `title` |
| knop zonder `type` (in een formulier verstuurt die het formulier!) | altijd `type="button"`, tenzij je `type="submit"` meegeeft |
| `btn btn-sm btn-…` | `variant="…"` + `size="sm"` |
| icoon zonder knoprand | `variant="plain"` (standaard), met de kleur via `className="text-danger"` |
| icoon + zichtbare tekst | `showLabel` |
| vaste 32×32 px (eLogger) | standaard 36 px, `sm` 30 px, `lg` 48 px, en altijd ≥ 44 px op touchscreens |

## Controlelijst

- [ ] Alle `AddButton`s zijn vervangen; `listenToKeyboard` is `keyboardShortcut` geworden
- [ ] Geen `span`, `div` of `i` met `onClick` en een icoon meer
- [ ] Elke knop met alleen een icoon heeft een betekenisvol `label`
- [ ] Gecontroleerd dat knoppen in formulieren niet langer per ongeluk het formulier versturen
- [ ] Typecheck en build van de app slagen

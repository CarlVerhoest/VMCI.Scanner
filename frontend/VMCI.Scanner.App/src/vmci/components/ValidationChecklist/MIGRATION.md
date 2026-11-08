# Migratie naar `ValidationChecklist`

## Vervangt

| Project | Oud pad | Oude naam | Bronversie |
| ------- | ------- | --------- | ---------- |
| eLogger | `src/components/PasswordReset.tsx` (inline, binnen de render) | `ValidationItem` | `1e94deb` |

## Gebruik vinden

```text
regex: \bValidationItem\b
```

## Mapping

| Oud | Nieuw |
| --- | ----- |
| `<ValidationItem isValid={…} text="…" />` (één per regel) | één `<ValidationChecklist rules={[{ key, label, isValid }, …]} />` |
| `text` | `label` |
| icoon `<i className="fas fa-check/fa-times">` (FA CSS) | ingebouwd (FA SVG) |
| `text-success` / `text-danger` | ingebouwd, plus een tekst voor schermlezers ("voldaan" of "niet voldaan"; Engels via `enLabels`) |

Koppel de lijst aan het wachtwoordveld met `aria-describedby`, of geef ze aan een `FormField` als `hint`.

**Opgelost:** `ValidationItem` werd **binnen** de render-functie gedefinieerd, waardoor React het bij elke render opnieuw mountte.

## Voorbeeld

```tsx
// oud
<ValidationItem isValid={checks.length} text="At least 8 characters" />
<ValidationItem isValid={checks.number} text="Contains a number" />
// nieuw
<ValidationChecklist
  id="password-rules"
  rules={[
    { key: 'length', label: 'At least 8 characters', isValid: checks.length },
    { key: 'number', label: 'Contains a number', isValid: checks.number },
  ]}
/>
```

## Controlelijst

- [ ] `ValidationItem` is verwijderd uit `PasswordReset.tsx`
- [ ] Het wachtwoordveld verwijst met `aria-describedby` naar de lijst
- [ ] Typecheck en build van de app slagen

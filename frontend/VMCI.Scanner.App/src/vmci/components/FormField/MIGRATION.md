# Migratie naar `FormField` en `RequiredMark`

FormField is nieuw. Er bestond geen vorige versie, maar wel overal hetzelfde handwerk: een label, een control, een hulptekst en een foutmelding, die zelden aan elkaar gekoppeld waren. Migreer **per formulier**, samen met FormActions.

## Vervangt

| Project | Oud pad / waar | Oud | Bronversie |
| ------- | -------------- | --- | ---------- |
| Claudine | `src/components/FormControls.tsx` | `RequiredMark` (`invalid`) + handgeschreven `<label>`/`Form.Label` | `fce4a94` |
| LevelUp | `src/components/FormControls.tsx` | idem | `4dfb97d` |
| VMCI.Scanner | `src/components/FormControls.tsx` | idem | `4400de4` |
| VMCI | `CurrencyModal`, `CustomerModal`, `ExpenseGroupFormModal`, `ExpenseModal`, `AutocompleteDropdown` | `<label>` **zonder** `htmlFor`, `is-invalid` + `invalid-feedback`, eigen rode `*` | `4da8795` |
| eLogger | formulieren (`LogFlightForm`, `AircraftForm`, …), `NumericInputControl` | `Form.Group` + `Form.Label` zonder `controlId` | `1e94deb` |
| KAZM.eSoar | `AppForms/*` | `Form.Group`/`Row`+`Col` met labels | `dc29d9a` |

## Gebruik vinden

```text
regex: \bRequiredMark\b
regex: <Form\.Group\b
regex: <Form\.Label\b|<label\b(?![^>]*htmlFor)
regex: invalid-feedback|Form\.Control\.Feedback
```

## RequiredMark

| Oud | Nieuw |
| --- | ----- |
| `import { RequiredMark } from '../components/FormControls'` | `import { RequiredMark } from '@vmci/ui'` |
| `<RequiredMark invalid={…} />` | `<RequiredMark isInvalid={…} />` (de naam volgt D-conventie `isInvalid`) |
| CSS `.claudine-required-mark` / `.level-up-required-mark` / `.scanner-required-mark` | `.vmci-required-mark`: verwijder de oude regels uit de app |

Binnen een FormField hoef je RequiredMark niet zelf te plaatsen: `required` doet dat, en zet ook `aria-required` op het control.

## FormField: mapping

| Oud | Nieuw |
| --- | ----- |
| `<label htmlFor="x">Naam <RequiredMark invalid={!!errors.name} /></label>` | `label="Naam" required` |
| `<input id="x" className={…is-invalid…} />` | het control als **kind**: id, `aria-*` en `is-invalid` worden ingevoegd. Een eigen `id` op het kind wordt gerespecteerd. |
| `<div className="invalid-feedback">{errors.name}</div>` | `error={errors.name}`: wordt getoond, gekoppeld via `aria-describedby` en voorgelezen |
| `<div className="form-text">…</div>` / `<Form.Text>` | `hint="…"` |
| `Form.Group controlId="x"` | `controlId="x"` (optioneel) |
| label links, veld rechts (`Row`/`Col sm={3}`) | `layout="horizontal"` (vanaf `md`; op mobiel onder elkaar). De breedte van het label stel je in met `--vmci-form-field-label-width`. |
| groep radio's of een knoppengroep met `<legend>` | `group` (rendert een `fieldset` met `legend`) |
| uitleg-icoon naast het label (KAZM `InfoOverlay`) | `info="…"` |
| `touched` + `validationErrors` (VMCI) | **behoud de validatielogica in de app**. Geef alleen `error={touched.code ? errors.code : undefined}` mee. |

**Checkbox of switch:** `Form.Check` heeft zijn eigen label en blijft zoals hij is. Gebruik FormField er niet rond.

**Controls die het element niet als prop aanvaarden** (een component die `id` en `aria-*` niet doorgeeft): gebruik dan de render-functie:

```tsx
<FormField label="Bedrag" required error={errors.amount}>
  {(field) => <MyLegacyInput inputId={field.id} invalid={field.isInvalid} />}
</FormField>
```

Voor een native element is er `field.inputProps`, met alleen DOM-attributen: `{(field) => <input {...field.inputProps} />}`.

## Voorbeeld

```tsx
// oud (VMCI CurrencyModal)
<div className="mb-3">
  <label className="form-label">Code <span className="text-danger">*</span></label>
  <input className={`form-control ${touched.code && errors.code ? 'is-invalid' : ''}`}
         value={code} onChange={…} onBlur={() => touch('code')} />
  {touched.code && errors.code && <div className="invalid-feedback">{errors.code}</div>}
</div>
// nieuw
<FormField label="Code" required error={touched.code ? errors.code : undefined}>
  <input className="form-control" value={code} onChange={…} onBlur={() => touch('code')} />
</FormField>
```

## Controlelijst

- [ ] Elk label is gekoppeld: in de app geeft `getByRole('textbox', { name: … })` het juiste veld
- [ ] De foutmeldingen staan in `error`, de hulpteksten in `hint`
- [ ] `RequiredMark invalid` heet nu `isInvalid`; de oude CSS-klassen zijn verwijderd
- [ ] De validatielogica van de app werkt ongewijzigd
- [ ] Gecontroleerd op mobiel (horizontale layout valt terug naar onder elkaar)
- [ ] Typecheck, build en tests van de app slagen

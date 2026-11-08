# Migratie naar `Selector` en `BooleanSelect`

## Vervangt

| Project | Oud pad | Oude naam | Bronversie |
| ------- | ------- | --------- | ---------- |
| Claudine | `src/components/VMCIUIComponents/VMCISelector.tsx` | `VMCISelector` (22×) | `fce4a94` |
| LevelUp | `src/components/VMCIUIComponents/VMCISelector.tsx` | `VMCISelector` (2×) | `4dfb97d` |
| VMCI.Scanner | `src/components/VMCIUIComponents/VMCISelector.tsx` | `VMCISelector` (2×) | `4400de4` |
| KAZM.eSoar | `src/UIComponents/MySelector.tsx` | `MySelector` (14×) | `dc29d9a` |
| Claudine | `src/components/HolidayPayPaidSelect.tsx` | `HolidayPayPaidSelect` → `BooleanSelect` | `fce4a94` |

## Gebruik vinden

```text
regex: \b(VMCISelector|MySelector|HolidayPayPaidSelect)\b
```

## Prop-mapping

| Oud | Nieuw | Omzetting |
| --- | ----- | --------- |
| `selectedValue: T \| T[] \| null` | `value` | Hernoemen (D2). Bij `multiSelect` is het **altijd een array** (`[]` voor niets). |
| `onValueChanged: (v: T \| T[] \| null) => void` | `onValueChanged` | **Getypeerd:** zonder `multiSelect` krijg je `T \| null`, met `multiSelect` krijg je `T[]`. De `Array.isArray`-checks bij de aanroeper mogen weg. |
| `options: T[]` (KAZM ook `T \| null`) | `options` | Een losse `T` wordt `[T]` en `null` wordt `[]`. |
| `valueLabel` | idem | |
| — | `optionKey` | **Aanbevolen.** De selectie wordt herkend op deze sleutel in plaats van op de objectreferentie. Vroeger brak de selectie als `selectedValue` een ander object was dan het object in `options`. Standaard is de sleutel het label. |
| `isInvalid`, `disabled`, `multiSelect`, `tabIndex`, `autoFocus`, `openMenuOnFocus`, `placeholder` | idem | |
| placeholder `'Kies...'` (Claudine), `'Selecteer...'` (LevelUp), `'select...'` (Scanner), `"selecteer..."` (KAZM) | standaard `'Kies…'` (`labels.placeholder`) | Wil je de oude tekst behouden, geef dan `placeholder` mee. |
| CSS-klassen `claudine-uicontrol-select` / `claudine-select__*`, `level-up-*`, `scanner-*` | `vmci-selector` / `vmci-select__*` | De stijl komt uit de tokens. Verwijder de app-specifieke `styles`. |
| geen koppeling met een label | `id`, of automatisch binnen `FormField` | Gebruik de render-functie: `<FormField label="…">{() => <Selector …/>}</FormField>`. |

**Nieuw:** `groups`, voor opties onder een kop; `loadOptions`, voor opties van de server tijdens het typen; `isClearable` en `isSearchable` (instelbaar); en `size="sm"`.

## Voorbeeld

```tsx
// oud
<VMCISelector
  options={statutes}
  selectedValue={statute}
  valueLabel="name"
  onValueChanged={(v) => { if (v && !Array.isArray(v)) setStatute(v) }}
/>
// nieuw
<Selector options={statutes} value={statute} valueLabel="name" optionKey="code" onValueChanged={setStatute} />
```

## Claudine: HolidayPayPaidSelect → BooleanSelect

```tsx
// oud
<HolidayPayPaidSelect label="Vakantiegeld" value={paid} emptyLabel="Onbekend" disabled={ro} onChange={setPaid} />
// nieuw
<FormField label="Vakantiegeld">
  {() => <BooleanSelect value={paid} onValueChanged={setPaid} disabled={ro}
           labels={{ yes: 'Betaald', no: 'Niet betaald', unknown: 'Onbekend' }} />}
</FormField>
```

`StatuteSelect` (Claudine) blijft een app-component, maar gebruikt voortaan intern `Selector`.

## Controlelijst

- [ ] `selectedValue` heet nu `value`; de `Array.isArray`-checks zijn weg
- [ ] `optionKey` is gezet waar de labels niet uniek zijn of de objecten opnieuw opgehaald worden
- [ ] Elke Selector heeft een label (FormField of `aria-label`)
- [ ] De CSS en de `styles` van react-select zijn uit de app verwijderd
- [ ] Getest in light en dark, ook binnen een modal (het menu valt erover)
- [ ] Typecheck, build en tests van de app slagen

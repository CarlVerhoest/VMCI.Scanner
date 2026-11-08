# Migratie naar `SegmentedControl`

## Vervangt

| Project | Oud pad / waar | Oud | Bronversie |
| ------- | -------------- | --- | ---------- |
| eLogger | `src/components/DateTimeDisplayToggle.tsx` | `DateTimeDisplayToggle` (UTC/LT) | `1e94deb` |
| LevelUp | `src/components/generation/ExtraExercises.tsx` | `btn-group` met verborgen radio's ("Hoe moeilijk?") | `4dfb97d` |
| Claudine, LevelUp, Scanner | `pages/Settings.tsx` | knoppengroep Licht/Donker en `.…-mode-option` | zie boven |

## Gebruik vinden

```text
regex: \bDateTimeDisplayToggle\b
regex: className=["'][^"']*btn-group
regex: -mode-option\b
```

Niet elke `btn-group` is een keuze. Een groep **acties** (Bewerken, Verwijderen) blijft een `btn-group`, en gaat niet naar SegmentedControl.

## eLogger: DateTimeDisplayToggle

`DateTimeDisplayToggle` hoeft niet weg: maak er een dun app-component van rond SegmentedControl, want de waarden (`DefaultTimezoneDisplayValues`) zijn domeinkennis.

```tsx
// app: src/components/DateTimeDisplayToggle.tsx
export function DateTimeDisplayToggle({ value, onChange, size = 'sm', variant = 'primary', className }: Props) {
  return (
    <SegmentedControl
      aria-label="Time display"
      size={size}
      variant={variant}
      className={className}
      value={value}
      onValueChanged={onChange}
      options={[
        { value: DefaultTimezoneDisplayValues.UTC, label: 'UTC' },
        { value: DefaultTimezoneDisplayValues.LT, label: 'LT' },
      ]}
    />
  )
}
```

| Oud | Nieuw |
| --- | ----- |
| `value`, `onChange(mode)` | `value`, `onValueChanged(mode)` |
| `size?: 'sm' \| 'lg'` (standaard `sm`) | `size` (geen standaard: geef `sm` mee) |
| `variant?: 'primary' \| 'light'` | `variant`: `primary`, `secondary` of `light` |
| twee `Button`s met solid of outline | radio's met het `btn-check`-patroon van Bootstrap: pijltjestoetsen werken en de groep heeft `role="radiogroup"` |
| `minWidth: 45px` inline | ingebouwd (min. 2,75rem) |

## LevelUp: knoppengroep met verborgen radio's

```tsx
// oud
<fieldset className="mb-3">
  <legend className="form-label fs-6">Hoe moeilijk?</legend>
  <div className="btn-group" role="group">
    {LEVELS.map(([value, label]) => (
      <label key={value} className={`btn ${levels === value ? 'btn-primary' : 'btn-outline-primary'}`}>
        <input type="radio" className="visually-hidden" name="extra-levels" value={value}
               checked={levels === value} onChange={() => setLevels(value)} />
        {label}
      </label>
    ))}
  </div>
</fieldset>
// nieuw
<FormField group label="Hoe moeilijk?">
  <SegmentedControl
    value={levels}
    onValueChanged={setLevels}
    options={[{ value: 'basis', label: 'Basis' }, { value: 'uitdaging', label: 'Uitdaging' }]}
  />
</FormField>
```

## Settings: Licht/Donker

```tsx
const { theme, setTheme } = useTheme()
<SegmentedControl
  aria-label="Thema"
  value={theme}
  onValueChanged={setTheme}
  options={[{ value: 'light', label: 'Licht', icon: faSun }, { value: 'dark', label: 'Donker', icon: faMoon }]}
/>
```

Verwijder daarna de CSS van `.claudine-mode-option`, `.level-up-mode-option` en `.scanner-mode-option`.

## Controlelijst

- [ ] Elke keuzegroep heeft een naam (`aria-label`, of `FormField group`)
- [ ] eLogger: DateTimeDisplayToggle is een wrapper rond SegmentedControl en de aanroepers zijn ongewijzigd
- [ ] Getest met het toetsenbord (Tab naar de groep, pijltjes kiezen)
- [ ] De CSS-klassen `*-mode-option` zijn verwijderd
- [ ] Typecheck en build van de app slagen

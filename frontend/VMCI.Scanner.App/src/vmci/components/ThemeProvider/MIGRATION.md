# Migratie naar `ThemeProvider`, `useTheme` en `ThemeSwitch`

Deze guide geldt voor de thema-logica van alle apps. Voer **eerst** de migratie van de stijl uit ([src/styles/MIGRATION.md](../../styles/MIGRATION.md)). ThemeProvider zet alleen `data-bs-theme`; de kleuren komen uit de tokens.

## Vervangt

| Project | Oud pad | Oude naam | Bronversie |
| ------- | ------- | --------- | ---------- |
| Claudine | `frontend/Claudine.App/src/contexts/ThemeContext.tsx` | `ThemeProvider`, `useTheme` (localStorage `claudine-theme`) | `fce4a94` |
| LevelUp | `frontend/LevelUp.App/src/contexts/ThemeContext.tsx` | idem (`level-up-theme`) | `4dfb97d` |
| VMCI.Scanner | `frontend/VMCI.Scanner.App/src/contexts/ThemeContext.tsx` | idem (`scanner-theme`) | `4400de4` |
| eLogger | `eLogger.App/src/contexts/ThemeContext.tsx` | `ThemeProvider`, `useTheme` (profiel op server, geen localStorage) | `1e94deb` |
| eLogger | `eLogger.App/src/components/ThemeToggle.tsx` | `ThemeToggle` | `1e94deb` |
| VMCI | `frontend/VMCI.App/src/contexts/ThemeContext.tsx` + `styles/theme.ts` (`applyTheme`) | `ThemeProvider`, `useTheme`, `applyTheme` (profiel + `vmci-theme`) | `4da8795` |
| Claudine, LevelUp, Scanner | `pages/Settings.tsx` | inline `form-switch` (Licht/Donker) | zie boven |

## Gebruik vinden

```text
regex: from ['"].*contexts/ThemeContext['"]
regex: \buseTheme\(
regex: <ThemeProvider\b
regex: \bapplyTheme\(
regex: <ThemeToggle\b
regex: data-bs-theme
```

Controleer ook componenten die `theme` lezen om klassen te kiezen, zoals `theme === 'dark' ? 'table-dark' : ''`. In eLogger gebeurt dat in FlightLogbook, Navigation en StatsPerAircraftType. Dat patroon is verboden (D7): verwijder die logica, want de tokens doen het werk.

## Import

```tsx
// oud
import { ThemeProvider, useTheme } from './contexts/ThemeContext'
// nieuw
import { ThemeProvider, ThemeSwitch, useTheme } from '@vmci/ui'
```

Verwijder daarna `contexts/ThemeContext.tsx`. Bij VMCI verwijder je ook `applyTheme` en de kleurwaarden in `styles/theme.ts`, die naar het tokens-bestand van de app verhuizen.

## Prop-mapping: ThemeProvider

| Oud | Nieuw | Omzetting |
| --- | ----- | --------- |
| storage key `claudine-theme` / `level-up-theme` / `scanner-theme` / `vmci-theme` | `storageKey="…"` | **Geef de oude sleutel mee**, zodat gebruikers hun keuze behouden: `<ThemeProvider storageKey="level-up-theme">`. |
| standaard: `prefers-color-scheme` | `defaultTheme="system"` (standaard) | Zelfde gedrag. **Nieuw:** de provider volgt OS-wijzigingen zolang de gebruiker nog niets koos (eLogger deed dat al). |
| VMCI: start in `'dark'` vóór het laden | `defaultTheme="system"` | De flits van dark naar light verdwijnt, want het thema wordt vóór de eerste paint gezet. |
| eLogger, VMCI: thema uit `user.defaultTheme` | `theme={…}` + `onThemeChanged` | Zie hieronder: *Keuze op de server bewaren*. |

## Prop-mapping: `useTheme()`

| Oud | Nieuw |
| --- | ----- |
| `{ theme, toggleTheme, setTheme }` (Claudine, LevelUp, Scanner, VMCI) | identiek |
| `{ theme, toggleTheme }` (eLogger) | identiek; `setTheme` is extra |
| `toggleTheme` is async en doet niets als je niet aangemeld bent (eLogger) | synchroon; aanmeldlogica: zie hieronder |

## Keuze op de server bewaren (eLogger, VMCI)

Wat er vroeger mogelijk was, blijft mogelijk. De app houdt de logica rond het profiel, en de provider zet alleen het attribuut.

```tsx
function AppThemeProvider({ children }: { children: ReactNode }) {
  const { user, updateUser } = useAuth()
  // Aangemeld: thema uit het profiel (gecontroleerd). Afgemeld: undefined → OS/localStorage.
  const [optimistic, setOptimistic] = useState<Theme | null>(null)
  const profileTheme = user ? (user.defaultTheme === DefaultTheme.DARK ? 'dark' : 'light') : undefined

  const save = async (next: Theme) => {
    if (!user) return
    setOptimistic(next)
    try {
      updateUser(await profileService.updateProfile({ ...user, defaultTheme: toDefaultTheme(next) }))
    } catch (error) {
      console.error('Failed to update theme preference:', error) // eLogger: terugdraaien
    } finally {
      setOptimistic(null)
    }
  }

  return (
    <ThemeProvider
      theme={user ? (optimistic ?? profileTheme) : undefined}
      onThemeChanged={save}
      storageKey="vmci-theme" // VMCI: lokale kopie; eLogger: storageKey={null}
    >
      {children}
    </ThemeProvider>
  )
}
```

- **eLogger:** als je afgemeld bent, mag je het thema niet wisselen. Gebruik `<ThemeSwitch disabled={!user} />`. Bij een serverfout draai je terug: laat `optimistic` dan weer los, zoals in het voorbeeld.
- **VMCI:** het thema blijft lokaal behouden, ook als de server faalt. Geef daarom de `storageKey` mee, zodat de lokale keuze bewaard wordt.

## ThemeSwitch (vervangt ThemeToggle en de schakelaars op de Settings-pagina's)

```tsx
// oud (eLogger)
<ThemeToggle />
// oud (Settings in Claudine, LevelUp, Scanner)
<div className="form-check form-switch">
  <input className="form-check-input" type="checkbox" id="themeSwitch"
         checked={theme === 'dark'} onChange={toggleTheme} />
  <label className="form-check-label" htmlFor="themeSwitch">Donkere modus</label>
</div>
// nieuw
<ThemeSwitch />
<ThemeSwitch labels={{ label: 'Dark Mode' }} />          // eLogger: Engelse tekst
```

| Oud | Nieuw |
| --- | ----- |
| hardgecodeerde `id="theme-toggle"` (eLogger) | automatisch uniek; met `id` zelf te kiezen |
| tekst in een `<span>` (eLogger) | echt `<label>`, waardoor de schakelaar een toegankelijke naam heeft |
| zon- of maan-icoon (eLogger) | `showIcon` (standaard aan) |
| enkel icoon, zonder tekst | `hideLabel`: de tekst blijft beschikbaar voor schermlezers |

**Functionaliteit behouden:** in de Settings-pagina's staat soms ook een knoppengroep "Licht/Donker" (`btn-group`). Vervang die door een `SegmentedControl` die door `useTheme()` aangestuurd wordt: zie [SegmentedControl/MIGRATION.md](../SegmentedControl/MIGRATION.md#settings-lichtdonker).

## Controlelijst

- [ ] `ThemeProvider` uit `@vmci/ui` omsluit de app, met de oude `storageKey` (Claudine, LevelUp, Scanner, VMCI)
- [ ] eLogger en VMCI: het thema uit het profiel via `theme` + `onThemeChanged`; gedrag bij afmelden en bij een serverfout gecontroleerd
- [ ] Alle imports van `contexts/ThemeContext` vervangen. Het oude bestand is verwijderd (VMCI: ook `applyTheme`)
- [ ] Geen component kiest nog klassen op basis van `theme`
- [ ] ThemeToggle en de inline schakelaars zijn vervangen door `<ThemeSwitch />`
- [ ] Typecheck, build en tests van de app slagen
- [ ] Visueel gecontroleerd: herladen behoudt het thema, er is geen flits, en het OS-thema wordt gevolgd zolang er niets gekozen is

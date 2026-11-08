# Migratie naar de VMCI-tokens (`vmci-tokens.css`, `vmci.css`)

Elke app vervangt haar eigen thema-variabelen en Bootstrap-overrides door **haar eigen tokens-bestand** met `--vmci-*` waarden. De Bootstrap-brug zit voortaan in de library. Doe dit **vóór** de migratie van de thema-logica ([ThemeProvider/MIGRATION.md](../components/ThemeProvider/MIGRATION.md)) en vóór alle andere componenten, want die lezen `--vmci-*`.

## Vervangt

| Project | Oud | Prefix | Bronversie |
| ------- | --- | ------ | ---------- |
| Claudine | `src/styles/theme.css` (955 regels; palet van de klant dsadmin.be, Montserrat) | `--claudine-*`, `.claudine-*` | `fce4a94` |
| LevelUp | `src/styles/theme.css` | `--level-up-*`, `.level-up-*` | `4dfb97d` |
| VMCI.Scanner | `src/styles/theme.css` | `--scanner-*`, `.scanner-*` | `4400de4` |
| VMCI | `src/styles/theme.ts` (palet + `applyTheme`), `src/styles/index.css` (603 regels, `!important`) | `--color-*` | `4da8795` |
| eLogger | `src/index.css`, `src/App.css` | `--elogger-*`, hardgecodeerde hex | `1e94deb` |
| KAZM.eSoar | geen thema; `HelperClasses/Styles.ts` (hex) | — | `dc29d9a` |

## Werkwijze

1. Maak in de app `src/styles/app-tokens.css` aan. Het voorbeeldthema [playground/themes/vmci.css](../../playground/themes/vmci.css) is een goed vertrekpunt. Vul **elke** token in, voor `:root, [data-bs-theme='light']` **én** `[data-bs-theme='dark']`. Houd `-rgb` gelijk aan de hex-waarde.
2. Laad de CSS in deze volgorde in `main.tsx`:
   ```ts
   import 'bootstrap/dist/css/bootstrap.min.css'
   import '@vmci/ui/styles/vmci-tokens.css'
   import '@vmci/ui/styles/vmci.css'
   import './styles/app-tokens.css'
   ```
3. Zet de waarden over volgens de mapping hieronder.
4. **Verwijder** uit de oude CSS alles wat `vmci.css` nu doet. Dat staat per project hieronder. Laat app-specifieke stijlen staan (header, menubar, worksheet, …), maar laat ze naar `--vmci-*` verwijzen of naar app-tokens met een eigen prefix.
5. Klassen die bij **latere** componenten horen (`*-uicontrol-*`, `*-required-mark`, `*-dropzone`), laat je voorlopig staan. Ze verdwijnen met de migratie van die componenten.

## Token-mapping

| `--vmci-*` | Claudine `--claudine-*` | LevelUp `--level-up-*` | Scanner `--scanner-*` | VMCI | eLogger |
| ---------- | ----------------------- | ---------------------- | --------------------- | ---- | ------- |
| `font-family` | `font-family` (+ Montserrat `@import` behouden in app-tokens) | `font-family` | `font-family` | `Inter, system-ui…` | `system-ui…` (index.css) |
| `bg` | `bg` | `bg` | `bg` | `--color-background` | Bootstrap-standaard |
| `surface` | `surface` | `surface` | `surface` | `--color-surface` | Bootstrap-standaard |
| `surface-border` | `surface-border` | `surface-border` | `surface-border` | `--color-border` | Bootstrap-standaard |
| `field-border` | = `surface-border` | `field-border` | = `surface-border` | `--color-border` | — |
| `text` | `text` | `text` | `text` | `--color-text-primary` | — |
| `text-muted` | `text-muted` | `text-muted` | `text-muted` | `--color-text-secondary` | — |
| `accent` | `accent` | `accent` | `accent` | `--color-primary` | `--elogger-navy` (`#031d40` / dark `#0a3a6e`) |
| `accent-hover` | `accent-hover` | `accent-hover` | `accent-hover` | `--color-primary-hover` | afgeleid (donkerder) |
| `accent-rgb` | `accent-rgb` (**alleen dark** → ook light invullen) | `accent-rgb` | `accent-rgb` | uit `theme.ts` | `3, 29, 64` |
| `on-accent` | — (wit) | `on-accent` | `on-accent` | `#FFFFFF` (light), donker in dark | wit |
| `accent-soft` | `accent-soft` | `accent-soft` | `accent-soft` | `rgba(132,164,16,.1)` (hover-tint) | — |
| `stripe-bg` | `stripe-bg` | = `accent-soft` (rij-streep) | = `accent-soft` | — | — |
| `selection-bg` | `selection-bg` | `selection-bg` | `selection-bg` | — | — |
| `shadow` | `shadow` | `shadow` | `shadow` | — | — |
| `backdrop` | `rgba(0,0,0,.5)` (VMCISpinner, inline) | idem | idem | — | — (KAZM: `rgba(50,50,50,.5)`) |
| `danger` | `danger` (**alleen dark** → light invullen) | `danger` | `danger` (**alleen dark** → light invullen) | `colors.status.error` | `#dc3545` |
| `danger-hover`, `danger-rgb`, `on-danger` | idem | aanwezig | idem | afleiden | afleiden |

Tokens die er **niet** in staan (Claudine `menubar-*`, `menu-item-*`, `segment-*`, `confidence-*`; LevelUp `brand-*`, `header-bg`; Scanner `logo-*`; eLogger `--elogger-gold`) blijven app-tokens met het eigen prefix in `app-tokens.css`.

## Wat `vmci.css` nu overneemt (dus verwijderen uit de app)

| Oude regel | In alle bronnen |
| ---------- | --------------- |
| `--bs-body-bg`, `--bs-body-color`, `--bs-secondary-color`, `--bs-border-color`, `--bs-primary(-rgb)`, `--bs-link-*`, `--bs-focus-ring-color`, `--bs-danger(-rgb)` | brug in `:root` en `[data-bs-theme]` |
| `--bs-dropdown-*`, `--bs-modal-bg`, `--bs-card-bg` | `.dropdown-menu`, `.modal`, `.card` |
| `.btn-primary`, `.btn-outline-primary`, `.btn-danger`, `.btn-outline-danger` via `--bs-btn-*` | knoppenblok |
| `.form-control`, `.form-select` (achtergrond en rand), focus, `.form-check-input:checked` | formulierblok |
| `body { font-family; background; color }`, `a { color }` | via de brug (`--bs-body-*`, `--bs-link-*`) |
| `.modal-dialog-scrollable .modal-content > form` | helper |

**Verschillen die je bewust moet behouden:**
- **LevelUp en Claudine** stylen `.btn-secondary` en `.btn-outline-secondary` als accent-knoppen. `vmci.css` laat secondary bewust neutraal (Bootstrap). Wil de app het oude uitzicht behouden, zet de oude regels dan in `app-tokens.css`, met `--vmci-*` in plaats van het oude prefix.
- **LevelUp en Claudine** zetten `font-weight: 600` op knoppen. Zet dat in `app-tokens.css` als je het wilt behouden.
- **VMCI** heeft groene card- en modal-headers met witte tekst. Die staan in het voorbeeldthema `playground/themes/vmci.css`: neem dat blok over.
- **VMCI** gebruikt overal `!important`. Verwijder die regels pas als je in de app visueel gecontroleerd hebt dat de brug ze overneemt. VMCI zet `data-bs-theme` voortaan via ThemeProvider, dus de `--bs-*` variabelen staan niet langer altijd op light.
- **eLogger** heeft riskante globale regels: elke `span` in dark mode, en `.position-relative .position-absolute` wordt `fixed` op mobiel. Die vallen niet onder deze migratie. Laat ze staan, en meld ze aan de gebruiker als kandidaat om op te ruimen.

## Hulpklassen

| Oud | Nieuw |
| --- | ----- |
| `.claudine-panel`, `.level-up-panel`, `.scanner-panel` | `.vmci-panel` |
| `.claudine-muted`, `.level-up-muted`, `.scanner-muted` (werkte **alleen in een panel**) | `.vmci-muted` (overal) |
| `.claudine-fieldset`, `.level-up-fieldset`, `.scanner-fieldset` | `.vmci-fieldset` |
| `.claudine-accent-dot`, `.level-up-accent-dot`, `.scanner-accent-dot` | `.vmci-accent-dot` |
| `.*-mode-option` | vervangen door `SegmentedControl`: zie [SegmentedControl/MIGRATION.md](../components/SegmentedControl/MIGRATION.md) |

Zoekpatronen:

```text
regex: (claudine|level-up|scanner)-(panel|muted|fieldset|accent-dot)\b
regex: var\(--(claudine|level-up|scanner)-(bg|surface|surface-border|field-border|text|text-muted|accent|accent-hover|accent-rgb|on-accent|accent-soft|stripe-bg|selection-bg|shadow|danger|danger-hover|danger-rgb|on-danger|font-family)\)
regex: var\(--color-(primary|primary-hover|background|surface|text-primary|text-secondary|border)\)
```

Vervang de gevonden variabelen in de **hele** app, dus ook in componenten en CSS van de app zelf, door de overeenkomstige `--vmci-*` uit de tabel.

## Controlelijst

- [ ] `app-tokens.css` bestaat, met **alle** tokens voor light **én** dark (ook `accent-rgb` en `danger` in light)
- [ ] De CSS wordt in de juiste volgorde geladen (Bootstrap → vmci-tokens → vmci → app-tokens)
- [ ] De zoekpatronen geven 0 resultaten. App-specifieke tokens behouden hun eigen prefix
- [ ] De bridge-, knop- en formulierregels zijn uit de oude CSS verwijderd. De bewuste verschillen staan in `app-tokens.css`
- [ ] Visueel gecontroleerd in light en dark, op mobiel en desktop: knoppen, formulieren, dropdowns, modals, cards, links en focusring
- [ ] Typecheck en build van de app slagen

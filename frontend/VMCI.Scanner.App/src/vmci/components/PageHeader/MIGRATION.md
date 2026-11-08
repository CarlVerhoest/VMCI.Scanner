# Migratie naar `PageHeader` en `SectionHeader`

Nieuw: er bestond geen component, maar het patroon "icoon + titel + acties" staat in bijna elke app.

## Vervangt

| Project | Waar | Oud | Bronversie |
| ------- | ---- | --- | ---------- |
| eLogger | `FlightLogbook`, `AircraftList`, `AircraftForm`, `LogFlightForm`, `Profile`, `Statistics` | `Card.Header className="bg-brand-gradient …"` met `<h5><i/> titel</h5>` + knoppen; `.bg-brand-section`, `.bg-navy-section` | `1e94deb` |
| VMCI | pagina's met cardheaders | groene `.card-header` (via de huisstijl-CSS) | `4da8795` |
| alle | pagina's | losse `<h1>`/`<h2>` met knoppen ernaast in een `d-flex` | — |

## Gebruik vinden

```text
regex: bg-brand-gradient|bg-brand-section|bg-navy-section
regex: <h[1-6][^>]*>\s*<(FontAwesomeIcon|i)\b
```

## Mapping

| Oud | Nieuw |
| --- | ----- |
| `<Card.Header className="bg-brand-gradient d-flex …"><h5><FontAwesomeIcon icon={faPlane}/> My Aircraft</h5><Button…/></Card.Header>` | `<SectionHeader variant="band" icon={faPlane} title="My Aircraft" actions={<Button…/>} />` als eerste kind van de `Card` |
| titel van de pagina in `<h2>` / `<h5>` | `<PageHeader title=… />` (een `<h1>`; met `headingLevel` te kiezen) |
| goudgradiënt `#f2cd5c → #ddb13e` (eLogger, hardcoded) | `variant="band"` volgt `--vmci-accent`. Wil eLogger de gradiënt behouden, zet dan in `app-tokens.css`: `.vmci-header--band { background: linear-gradient(135deg, var(--elogger-gold), …); color: var(--elogger-navy); }` |
| `.bg-navy-section` | `SectionHeader` (plain), of `variant="band"` met een app-specifieke klasse |
| `text-shadow`, `!important`-regels | weg |

**Let op de koppenstructuur:** gebruik per pagina één `PageHeader` (h1) en `SectionHeader`s (h2) daaronder. Een h5 als paginatitel (eLogger) was voor schermlezers verwarrend.

## Controlelijst

- [ ] Elke pagina heeft één PageHeader, met daaronder SectionHeaders in de juiste volgorde
- [ ] De CSS `.bg-brand-*` en `.bg-navy-section` is verwijderd, of als `--vmci-*`-override in `app-tokens.css` gezet
- [ ] Gecontroleerd op mobiel: de acties schuiven onder de titel en de knoppen zijn breed genoeg
- [ ] Typecheck en build van de app slagen

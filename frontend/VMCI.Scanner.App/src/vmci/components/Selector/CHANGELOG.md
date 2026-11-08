# Changelog: Selector

Alle wijzigingen aan deze component. Versies volgen SemVer, zie [docs/conventies.md](../../../docs/conventies.md) §11.

## 1.1.0 (2026-11-05)

- Zoekveld: `minInputLength` (pas laden vanaf zoveel tekens, met de nieuwe tekst `labels.typeMore`) en `enableOptionFilter` (`false`: het antwoord van de server niet nog eens filteren op de label).
- `groupBy`: opties onder kopjes, ook voor geladen opties (`groups` werkt alleen met een vaste lijst).
- `renderOption`: eigen inhoud van een optie in het menu, bv. een titel met een grijze ondertitel.
- `icon`: een icoon in plaats van de pijl, bv. `faMagnifyingGlass`.
- `menuMinWidth`: het menu mag breder zijn dan het veld.
- Nieuwe afhankelijkheden: `@fortawesome/react-fontawesome` en `@fortawesome/fontawesome-svg-core`.

## 1.0.0 (2026-10-19)

- Eerste versie als los versioneerbare component.

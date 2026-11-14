# Changelog: Table

Alle wijzigingen aan deze component. Versies volgen SemVer, zie [docs/conventies.md](../../../docs/conventies.md) §11.

## 1.2.1 (2026-11-13)

- Een knop in een rij (bv. een `ActionMenu`) houdt zijn focus. Enter op een knop is ook een klik; die klik ging naar de rij, en die zette de focus op de tabel. Daardoor werkten ↓ en Escape in een actiemenu niet met het toetsenbord. De rij wordt nog wel geselecteerd; een klik op de rij zelf zet de focus zoals vroeger op de tabel. Geen wijziging in de API. (uit KAZM.eSoar)

## 1.2.0 (2026-11-10)

- Nieuwe props `onRowSwipeDelete`, `swipeDeleteDirection` en `swipeDeleteThreshold`: in de card-layout (mobiel) kan een card weggeveegd worden om de rij te verwijderen, met `SwipeToDelete`. Uit VMCI (uitgaven, munten, klanten). Nieuwe afhankelijkheid `swipe-to-delete ^1.0.0`.

## 1.1.0 (2026-11-08)

- Nieuwe kolomoptie `wrap`: lange waarden lopen over meerdere regels in plaats van af te breken met "…". Voor waarden die altijd volledig leesbaar moeten zijn, zoals namen en adressen.

## 1.0.0 (2026-10-19)

- Eerste versie als los versioneerbare component.

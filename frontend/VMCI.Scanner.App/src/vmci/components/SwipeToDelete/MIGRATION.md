# Migratie naar `SwipeToDelete`

## Vervangt

| Project | Oud pad | Oud | Bronversie |
| ------- | ------- | --- | ---------- |
| VMCI | `src/components/ExpenseCard.tsx`, `CurrencyCard.tsx`, `CustomerCard.tsx` | ingebouwde swipe-logica (3× gekopieerd): naar **rechts** voorbij 50 % | `4da8795` |
| eLogger | `FlightLogbook`, `AircraftList` | inline touch-handlers, rode achtergrond "Swipe to delete", max. 150 px | `1e94deb` |

## Gebruik vinden

```text
regex: onTouchStart|onTouchMove|handleDragStart|translateX\(
regex: delete-indicator|Swipe to delete
```

## Werkwijze

1. Verwijder de swipe-state en de handlers uit de card of rij (`dragDistance`, `isDragging`, `startXRef`, `onTouch*`, de mouse-listeners op `document`).
2. Wikkel de card in `SwipeToDelete` en geef `onDelete` mee. Dat opent meestal de bestaande bevestiging (`ExpenseDeleteConfirm`, `FlightDeleteModal`, of `ConfirmDialog` na stap 6).
3. Verwijder de CSS `.delete-indicator` en de swipe-stijlen.

```tsx
// oud (VMCI): swipe-logica binnen ExpenseCard
<ExpenseCard expense={e} onEdit={edit} onDelete={askDelete} />
// nieuw
<SwipeToDelete direction="right" threshold={0.5} onDelete={() => askDelete(e)}>
  <ExpenseCard expense={e} onEdit={edit} />
</SwipeToDelete>
```

## Mapping

| Oud | Nieuw |
| --- | ----- |
| VMCI: swipe naar **rechts**, drempel 50 % | `direction="right"` `threshold={0.5}` |
| eLogger: swipe naar links | `direction="left"` (standaard) |
| VMCI: verwijdert **tijdens** het slepen, zodra 50 % bereikt is | verwijdert pas **bij het loslaten** voorbij de drempel, dus de gebruiker kan nog terug |
| rode achtergrond `#dc3545` (hardgecodeerd) | `--vmci-danger` / `--vmci-on-danger` |
| alleen swipe (onvindbaar, niet met het toetsenbord) | plus een zichtbare verwijderknop (`showButton`, standaard aan). Zet `showButton={false}` als de rij al een verwijderknop of actiemenu heeft. |
| een klik na een swipe opende de card | een swipe telt nooit als klik |
| verticaal scrollen was soms geblokkeerd | verticaal scrollen blijft werken (`touch-action: pan-y`) |

## Controlelijst

- [ ] De swipe-logica is uit alle cards en rijen verwijderd (zoekpatronen geven 0 resultaten)
- [ ] De richting en drempel zijn gecontroleerd met de gebruikers van de app
- [ ] De bevestiging vóór het verwijderen werkt nog (via `onDelete`)
- [ ] Getest op een telefoon: vegen, terugveren, scrollen
- [ ] Typecheck, build en tests van de app slagen

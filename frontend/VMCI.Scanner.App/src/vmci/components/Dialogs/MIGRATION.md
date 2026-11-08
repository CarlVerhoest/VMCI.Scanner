# Migratie naar `ConfirmDialog`, `MessageDialog`, `FormModal` en `useConfirm`/`useMessage`

Alle dialogen gebruiken react-bootstrap `Modal`. Daarmee krijgen ze een focus trap, herstel van de focus, Escape, en een titel en melding die gekoppeld zijn voor schermlezers.

## Vervangt

| Project | Oud pad | Oude naam | Wordt | Bronversie |
| ------- | ------- | --------- | ----- | ---------- |
| Claudine | `src/components/ConfirmDialog.tsx` | `ConfirmDialog` (10×) | `ConfirmDialog` | `fce4a94` |
| LevelUp, VMCI.Scanner | idem | `ConfirmDialog` (3× / 3×) | `ConfirmDialog` | zie inventaris |
| VMCI | `src/components/{Expense,Currency,Customer}DeleteConfirm.tsx` | 3 kopieën | `ConfirmDialog` | `4da8795` |
| eLogger | `FlightDeleteModal.tsx`, `Aircraft/AircraftDeleteModal.tsx` | 2 kopieën | `ConfirmDialog` | `1e94deb` |
| KAZM.eSoar | `src/UIComponents/SimpleModal.tsx` | `SimpleModal` (22×) | `MessageDialog` of `useMessage` | `dc29d9a` |
| VMCI | `src/components/ErrorModal.tsx` | `ErrorModal` | `MessageDialog tone="danger"` | `4da8795` |
| KAZM.eSoar | `src/UIComponents/NumericModal.tsx` | `NumericModal` (2×) | `FormModal` + `NumberInput` | `dc29d9a` |
| VMCI | `CurrencyModal`, `CustomerModal`, `ExpenseGroupFormModal` (zelfgebouwde modals) | — | `FormModal` | `4da8795` |

## Gebruik vinden

```text
regex: \b(ConfirmDialog|\w+DeleteConfirm|\w+DeleteModal|SimpleModal|ErrorModal|NumericModal)\b
regex: className=["'][^"']*modal show d-block
regex: ModalResult\.|ModalButtons\.
```

## ConfirmDialog

| Oud (Claudine-lijn) | Nieuw | Omzetting |
| ------------------- | ----- | --------- |
| `show`, `title`, `message`, `variant`, `error`, `onConfirm` | idem | |
| `onCancel` | `onHide` | hernoemen (D12) |
| `isConfirming` | `isBusy` | hernoemen (D12); de dialoog is nu ook niet te sluiten via ×, Escape of de achtergrond |
| `confirmLabel` | idem | |
| `cancelLabel` | `labels={{ cancel }}` | |
| "Bezig..." (hardcoded) | `labels.busy` | |
| — | `children` | samenvatting van het record (VMCI-kaartje, eLogger-infobox) |

| Oud (VMCI DeleteConfirm, eLogger DeleteModal) | Nieuw |
| --------------------------------------------- | ----- |
| `isOpen` / `show` | `show` |
| `onCancel` / `onHide` | `onHide` |
| `isDeleting` | `isBusy` |
| `expense` / `flight` / `aircraft` (de component tekende de samenvatting) | de samenvatting als `children`; de entiteit blijft in de app |
| geeft `null` terug zonder entiteit (de sluitanimatie brak) | render ConfirmDialog altijd; stuur via `show` |

## MessageDialog (KAZM SimpleModal, VMCI ErrorModal)

| Oud | Nieuw |
| --- | ----- |
| `headingText` | `title` |
| `bodyText` | `message` |
| `buttons={ModalButtons.OK \| OKCancel \| YesNo}` | `buttons="ok" \| "okCancel" \| "yesNo"` |
| `onClose(ModalResult.OK \| Cancel)` | `onHide('ok' \| 'cancel')` (Ja geeft `'ok'`, Nee geeft `'cancel'`) |
| de component stond altijd open zolang hij gemount was | gestuurd via `show`, of nog eenvoudiger met `useMessage()` |
| ErrorModal `isOpen`, `onClose`, icoon `fas fa-…` (werd niet getoond) | `show`, `onHide`, `tone="danger"` (icoon werkt) |

**Vaak eenvoudiger: de hooks.** Zet één keer een `<DialogProvider>` rond de app, binnen `VMCIProvider`, en gebruik dan:

```tsx
// oud (KAZM, class component)
this.setState({ showDeleteModal: true })
…
{this.state.showDeleteModal && (
  <SimpleModal headingText="Verwijderen" bodyText="Zeker?" buttons={ModalButtons.YesNo}
    onClose={(r) => { this.setState({ showDeleteModal: false }); if (r === ModalResult.OK) this.delete() }} />
)}
// nieuw (function component)
const confirm = useConfirm()
if (await confirm({ title: 'Verwijderen', message: 'Zeker?' })) await remove()
// of met busy en fout in de dialoog zelf:
await confirm({ title: 'Verwijderen', message: 'Zeker?', action: () => api.delete(id) })
```

In KAZM-**class components** werken hooks niet. Gebruik daar `MessageDialog` of `ConfirmDialog` met `show`, of zet een functiecomponent rond het deel dat de vraag stelt.

## FormModal

```tsx
// oud (VMCI): zelfgebouwde modal met eigen achtergrond, Escape-listener en z-index
// nieuw
<FormModal show={show} title={currency ? 'Edit currency' : 'New currency'} isBusy={saving}
  error={saveError} onHide={close} onSubmit={save}>
  <FormField label="Code" required error={touched.code ? errors.code : undefined}>
    <input className="form-control" value={code} onChange={…} />
  </FormField>
  …
</FormModal>
```

| Oud | Nieuw |
| --- | ----- |
| `isOpen`, `onClose` | `show`, `onHide` |
| `onSubmit(request)` | `onSubmit(event)`: bouw het request in de app; `preventDefault` is al gebeurd |
| `loading` (werkte niet: synchroon om een niet-awaited submit) | `isBusy`: zet het zelf rond je `await` |
| `error` (werd nooit gezet) | `error`: getoond boven de velden |
| footer Annuleren/Opslaan | ingebouwd (FormActions); Engels via `labels` of `enLabels` |
| `z-index` 1056/1057 per modal | Bootstrap regelt het stapelen (ook geneste modals) |

**KAZM NumericModal:** een `FormModal` met één `NumberInput` (`precision={0}`, `min={0}`, `step={1}`).

## Controlelijst

- [ ] Alle oude dialogen en modals zijn vervangen (zoekpatronen geven 0 resultaten)
- [ ] `DialogProvider` staat rond de app (als `useConfirm` of `useMessage` gebruikt wordt)
- [ ] Bezig-states: `isConfirming`/`isDeleting`/`isSaving` heten nu `isBusy`
- [ ] Getest met het toetsenbord: Tab blijft in de dialoog, Escape sluit (niet tijdens bezig), de focus keert terug
- [ ] Getest op een telefoon: FormModal fullscreen, knoppen onder elkaar
- [ ] Typecheck, build en tests van de app slagen

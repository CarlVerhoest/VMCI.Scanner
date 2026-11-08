# Migratie naar `FormActions`

## Vervangt

| Project | Oud pad | Oude naam | Bronversie |
| ------- | ------- | --------- | ---------- |
| Claudine | `src/components/FormControls.tsx` | `FormActions` (11×) | `fce4a94` |
| LevelUp | `src/components/FormControls.tsx` | `FormActions` | `4dfb97d` |
| VMCI.Scanner | `src/components/FormControls.tsx` | `FormActions` | `4400de4` |
| KAZM.eSoar | `AppForms/_StandardForm` en alle AppForms | rechts uitgelijnde "Annuleren" + "Opslaan" | `dc29d9a` |
| VMCI | formuliermodals | footer met Cancel/Save | `4da8795` |

## Gebruik vinden

```text
regex: \bFormActions\b
regex: ['"](Opslaan|Save)['"]|>\s*(Opslaan|Save)\s*<
```

## Prop-mapping

| Oud | Nieuw | Omzetting |
| --- | ----- | --------- |
| `isSaving: boolean` | `isBusy?: boolean` | hernoemen (D12) |
| `onCancel: () => void` (verplicht) | `onCancel?: () => void` | 1-op-1; zonder handler is er geen Annuleren-knop |
| `disabled?: boolean` (alleen Opslaan) | `disabled` | 1-op-1, zelfde betekenis |
| teksten "Opslaan" / "Bezig met opslaan..." / "Annuleren" (hardcoded) | `labels={{ save, saving, cancel }}` | standaard dezelfde Nederlandse teksten; Engels via `enLabels` |
| — | `extra` | knoppen links, bv. "Verwijderen" (KAZM-formulieren) |
| — | `saveVariant` | `primary` (standaard), `danger`, `success` |

## Gedragswijzigingen

- **Mobiel:** de knoppen staan onder elkaar over de volle breedte, met Opslaan bovenaan. Vanaf `sm` staan ze op één rij, rechts uitgelijnd zoals vroeger.
- Tijdens `isBusy` toont Opslaan een kleine spinner en `aria-busy`.
- **KAZM:** "Annuleren" was daar een `type="reset"`-knop. FormActions roept `onCancel` aan. Wil je het formulier leegmaken, doe dat dan in `onCancel`.
- De volgorde blijft **Opslaan, dan Annuleren** (zoals in Claudine, LevelUp en Scanner). KAZM had Annuleren eerst: de nieuwe volgorde is de standaard.

## Voorbeeld

```tsx
// oud
<FormActions isSaving={saving} onCancel={() => navigate(-1)} disabled={!canSave} />
// nieuw
<FormActions isBusy={saving} onCancel={() => navigate(-1)} disabled={!canSave} />
```

## Controlelijst

- [ ] `isSaving` heet nu `isBusy`; de import komt uit `@vmci/ui`; `FormControls.tsx` is verwijderd (samen met RequiredMark)
- [ ] FormActions staat binnen de `<form onSubmit>` (Opslaan is een submit-knop)
- [ ] KAZM: de reset-logica van Annuleren zit nu in `onCancel`
- [ ] Gecontroleerd op mobiel en desktop
- [ ] Typecheck, build en tests van de app slagen

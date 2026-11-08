# Migratie naar `List`

## Vervangt

| Project | Oud pad | Oude naam | Bronversie |
| ------- | ------- | --------- | ---------- |
| Claudine | `src/components/VMCIUIComponents/VMCIList.tsx` | `VMCIList` (15×) | `fce4a94` |
| LevelUp, VMCI.Scanner | idem | `VMCIList` (0×) | zie inventaris |
| KAZM.eSoar | `src/UIComponents/MyList.tsx` | `MyList` (4×) | `dc29d9a` |

## Gebruik vinden

```text
regex: \b(VMCIList|MyList)\b
```

## Prop-mapping

| Oud | Nieuw | Omzetting |
| --- | ----- | --------- |
| `data`, `columns`, `showHeader` | idem | |
| `emptyStateText` | `labels={{ empty }}` of `emptyState` | |
| kolom `cell: string` (een property **of** letterlijke tekst, dubbelzinnig) | `accessorKey: 'naam'` voor een property; `cell: () => 'tekst'` voor letterlijke tekst | **Controleer elke string-`cell`:** was het een veldnaam, gebruik dan `accessorKey`. |
| kolom `cell: (row) => …` | `cell: (row, index) => …` | |
| kolom `header: string \| () => … \| null` | `header?: ReactNode \| () => ReactNode` | |
| `className`, `headerClassName` | idem | |
| keys op de index | `rowKey` | aanbevolen |
| — | `onRowClick`, `rowClassName`, `cardBreakpoint`, `fitContent` per kolom | nieuw |

**Opgelost (KAZM):** de lege toestand toonde 7 lege gestreepte rijen, gebouwd uit fragments zonder key. Er is nu één lege melding. De zebrastrepen gebruiken het token `--vmci-stripe-bg` in plaats van de hardgecodeerde `#ebf5fb`.

## Voorbeeld

```tsx
// oud
<VMCIList data={fees} columns={[{ id: 'label', header: 'Omschrijving', cell: 'label' }]} />
// nieuw
<List data={fees} rowKey="id" columns={[{ id: 'label', header: 'Omschrijving', accessorKey: 'label' }]} />
```

## Controlelijst

- [ ] Elke string-`cell` is omgezet naar `accessorKey` of naar een functie
- [ ] Gecontroleerd op mobiel (cards met labels)
- [ ] Typecheck, build en tests van de app slagen

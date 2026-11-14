/** Texts shown by AddButton; override via `labels` or VMCIProvider (`addButton`). */
export interface AddButtonLabels {
  /** Accessible name and tooltip. */
  label: string
}

export const addButtonLabels: AddButtonLabels = {
  label: 'Toevoegen',
}

export const addButtonLabelsEn: AddButtonLabels = { label: 'Add' }

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    addButton: AddButtonLabels
  }
}

/** Texts shown by LabeledValue; override via `labels` or VMCIProvider (`labeledValue`). */
export interface LabeledValueLabels {
  /** Shown when the value is empty. */
  empty: string
}

export const labeledValueLabels: LabeledValueLabels = {
  empty: 'Niet ingevuld',
}

export const labeledValueLabelsEn: LabeledValueLabels = { empty: 'Not set' }

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    labeledValue: LabeledValueLabels
  }
}

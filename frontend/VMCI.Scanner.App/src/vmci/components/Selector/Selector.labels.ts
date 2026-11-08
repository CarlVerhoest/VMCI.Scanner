/** Texts shown by Selector; override via `labels` or VMCIProvider (`selector`). */
export interface SelectorLabels {
  placeholder: string
  noOptions: string
  loading: string
  /** With `minInputLength`: shown until enough has been typed. */
  typeMore: (minLength: number) => string
}

export const selectorLabels: SelectorLabels = {
  placeholder: 'Kies…',
  noOptions: 'Geen opties',
  loading: 'Laden…',
  typeMore: (n) => `Typ minstens ${n} tekens`,
}

/** Texts shown by BooleanSelect; override via `labels` or VMCIProvider (`booleanSelect`). */
export interface BooleanSelectLabels {
  yes: string
  no: string
  /** Shown when the value is null. */
  unknown: string
}

export const booleanSelectLabels: BooleanSelectLabels = {
  yes: 'Ja',
  no: 'Nee',
  unknown: 'Onbekend',
}

export const selectorLabelsEn: SelectorLabels = {
  placeholder: 'Choose…',
  noOptions: 'No options',
  loading: 'Loading…',
  typeMore: (n) => `Type at least ${n} characters`,
}

export const booleanSelectLabelsEn: BooleanSelectLabels = {
  yes: 'Yes',
  no: 'No',
  unknown: 'Unknown',
}

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    selector: SelectorLabels
    booleanSelect: BooleanSelectLabels
  }
}

/** Texts shown by Spinner; override via `labels` or VMCIProvider (`spinner`). */
export interface SpinnerLabels {
  /** Announced to screen readers while the spinner is active. */
  busy: string
}

export const spinnerLabels: SpinnerLabels = {
  busy: 'Bezig met laden…',
}

export const spinnerLabelsEn: SpinnerLabels = { busy: 'Loading…' }

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    spinner: SpinnerLabels
  }
}

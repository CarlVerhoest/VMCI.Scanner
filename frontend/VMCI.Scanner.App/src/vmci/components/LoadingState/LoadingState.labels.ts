/** Texts shown by LoadingState; override via `labels` or VMCIProvider (`loadingState`). */
export interface LoadingStateLabels {
  /** Text next to the spinner (and announced to screen readers). */
  loading: string
}

export const loadingStateLabels: LoadingStateLabels = {
  loading: 'Laden…',
}

export const loadingStateLabelsEn: LoadingStateLabels = { loading: 'Loading…' }

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    loadingState: LoadingStateLabels
  }
}

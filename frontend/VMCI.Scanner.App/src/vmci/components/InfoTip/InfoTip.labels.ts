/** Texts shown by InfoTip; override via `labels` or VMCIProvider (`infoTip`). */
export interface InfoTipLabels {
  /** Accessible name of the info button. */
  label: string
}

export const infoTipLabels: InfoTipLabels = {
  label: 'Meer informatie',
}

export const infoTipLabelsEn: InfoTipLabels = { label: 'More information' }

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    infoTip: InfoTipLabels
  }
}

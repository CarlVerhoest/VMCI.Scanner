/** Texts shown by ValidationChecklist; override via `labels` or VMCIProvider (`validationChecklist`). */
export interface ValidationChecklistLabels {
  /** Read after a rule that is met (screen readers only). */
  met: string
  /** Read after a rule that is not met (screen readers only). */
  notMet: string
}

export const validationChecklistLabels: ValidationChecklistLabels = {
  met: 'voldaan',
  notMet: 'niet voldaan',
}

export const validationChecklistLabelsEn: ValidationChecklistLabels = {
  met: 'met',
  notMet: 'not met',
}

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    validationChecklist: ValidationChecklistLabels
  }
}

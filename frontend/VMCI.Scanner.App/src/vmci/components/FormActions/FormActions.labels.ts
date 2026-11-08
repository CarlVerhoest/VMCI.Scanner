/** Texts shown by FormActions; override via `labels` or VMCIProvider (`formActions`). */
export interface FormActionsLabels {
  save: string
  /** Save button text while `isBusy`. */
  saving: string
  cancel: string
}

export const formActionsLabels: FormActionsLabels = {
  save: 'Opslaan',
  saving: 'Bezig met opslaan…',
  cancel: 'Annuleren',
}

export const formActionsLabelsEn: FormActionsLabels = {
  save: 'Save',
  saving: 'Saving…',
  cancel: 'Cancel',
}

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    formActions: FormActionsLabels
  }
}

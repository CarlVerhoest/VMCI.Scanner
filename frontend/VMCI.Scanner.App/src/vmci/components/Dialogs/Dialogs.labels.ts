/** Texts shown by ConfirmDialog, MessageDialog and useConfirm/useMessage (`dialogs`). */
export interface DialogsLabels {
  confirm: string
  cancel: string
  busy: string
  ok: string
  yes: string
  no: string
  close: string
}

export const dialogsLabels: DialogsLabels = {
  confirm: 'Bevestigen',
  cancel: 'Annuleren',
  busy: 'Bezig…',
  ok: 'OK',
  yes: 'Ja',
  no: 'Nee',
  close: 'Sluiten',
}

export const dialogsLabelsEn: DialogsLabels = {
  confirm: 'Confirm',
  cancel: 'Cancel',
  busy: 'Working…',
  ok: 'OK',
  yes: 'Yes',
  no: 'No',
  close: 'Close',
}

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    dialogs: DialogsLabels
  }
}

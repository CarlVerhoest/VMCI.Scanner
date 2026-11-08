/** Texts shown by ShareActions; override via `labels` or VMCIProvider (`shareActions`). */
export interface ShareActionsLabels {
  share: string
  download: string
}

export const shareActionsLabels: ShareActionsLabels = {
  share: 'Delen',
  download: 'Downloaden',
}

export const shareActionsLabelsEn: ShareActionsLabels = {
  share: 'Share',
  download: 'Download',
}

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    shareActions: ShareActionsLabels
  }
}

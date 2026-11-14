/** Texts shown by SwipeToDelete; override via `labels` or VMCIProvider (`swipeToDelete`). */
export interface SwipeToDeleteLabels {
  /** Text behind the swiped content and name of the delete button. */
  delete: string
}

export const swipeToDeleteLabels: SwipeToDeleteLabels = {
  delete: 'Verwijderen',
}

export const swipeToDeleteLabelsEn: SwipeToDeleteLabels = { delete: 'Delete' }

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    swipeToDelete: SwipeToDeleteLabels
  }
}

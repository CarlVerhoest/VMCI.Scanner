/** Texts shown by ActionMenu; override via `labels` or VMCIProvider (`actionMenu`). */
export interface ActionMenuLabels {
  /** Accessible name and tooltip of the "⋮" toggle. */
  toggle: string
}

export const actionMenuLabels: ActionMenuLabels = {
  toggle: 'Acties',
}

export const actionMenuLabelsEn: ActionMenuLabels = { toggle: 'Actions' }

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    actionMenu: ActionMenuLabels
  }
}

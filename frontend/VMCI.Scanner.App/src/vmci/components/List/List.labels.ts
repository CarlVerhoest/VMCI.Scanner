/** Texts shown by List; override via `labels` or VMCIProvider (`list`). */
export interface ListLabels {
  empty: string
}

export const listLabels: ListLabels = {
  empty: 'Geen gegevens',
}

export const listLabelsEn: ListLabels = { empty: 'No data' }

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    list: ListLabels
  }
}

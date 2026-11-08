/** Texts shown by EmptyState; override via `labels` or VMCIProvider (`emptyState`). */
export interface EmptyStateLabels {
  /** Title when no `title` prop is given. */
  title: string
}

export const emptyStateLabels: EmptyStateLabels = {
  title: 'Geen gegevens',
}

export const emptyStateLabelsEn: EmptyStateLabels = { title: 'No data' }

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    emptyState: EmptyStateLabels
  }
}

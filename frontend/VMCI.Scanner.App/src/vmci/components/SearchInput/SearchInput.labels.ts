/** Texts shown by SearchInput; override via `labels` or VMCIProvider (`searchInput`). */
export interface SearchInputLabels {
  /** Accessible name when no label is linked. */
  label: string
  placeholder: string
  /** Accessible name and tooltip of the clear button. */
  clear: string
}

export const searchInputLabels: SearchInputLabels = {
  label: 'Zoeken',
  placeholder: 'Zoeken…',
  clear: 'Zoekterm wissen',
}

export const searchInputLabelsEn: SearchInputLabels = {
  label: 'Search',
  placeholder: 'Search…',
  clear: 'Clear search',
}

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    searchInput: SearchInputLabels
  }
}

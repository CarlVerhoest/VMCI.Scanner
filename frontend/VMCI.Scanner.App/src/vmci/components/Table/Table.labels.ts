/** Texts shown by Table; override via `labels` or VMCIProvider (`table`). */
export interface TableLabels {
  search: string
  searchPlaceholder: string
  empty: string
  noResults: string
  pagination: string
  first: string
  previous: string
  next: string
  last: string
  page: (page: number) => string
  pageOf: (page: number, total: number) => string
  pageSize: string
  all: string
  resetWidths: string
  resetWidthsTitle: string
  resizeColumn: string
  sortBy: string
  noSorting: string
  ascending: (column: string) => string
  descending: (column: string) => string
}

export const tableLabels: TableLabels = {
  search: 'Zoeken',
  searchPlaceholder: 'Zoeken in alle kolommen…',
  empty: 'Geen gegevens',
  noResults: 'Niets gevonden voor deze zoekterm',
  pagination: 'Paginering',
  first: 'Eerste pagina',
  previous: 'Vorige',
  next: 'Volgende',
  last: 'Laatste pagina',
  page: (page) => `Pagina ${page}`,
  pageOf: (page, total) => `Pagina ${page} van ${total}`,
  pageSize: 'Per pagina',
  all: 'Alles',
  resetWidths: 'Kolombreedtes herstellen',
  resetWidthsTitle: 'Alle kolommen van deze tabel terug op hun standaardbreedte zetten',
  resizeColumn:
    'Sleep om de kolombreedte aan te passen, dubbelklik om de kolom aan de inhoud aan te passen',
  sortBy: 'Sorteren op',
  noSorting: 'Geen sortering',
  ascending: (column) => `${column} (oplopend)`,
  descending: (column) => `${column} (aflopend)`,
}

export const tableLabelsEn: TableLabels = {
  search: 'Search',
  searchPlaceholder: 'Search all columns…',
  empty: 'No data',
  noResults: 'Nothing found for this search',
  pagination: 'Pagination',
  first: 'First page',
  previous: 'Previous',
  next: 'Next',
  last: 'Last page',
  page: (page) => `Page ${page}`,
  pageOf: (page, total) => `Page ${page} of ${total}`,
  pageSize: 'Per page',
  all: 'All',
  resetWidths: 'Reset column widths',
  resetWidthsTitle: 'Put all columns of this table back to their default width',
  resizeColumn: 'Drag to resize the column, double-click to fit it to its content',
  sortBy: 'Sort by',
  noSorting: 'No sorting',
  ascending: (column) => `${column} (ascending)`,
  descending: (column) => `${column} (descending)`,
}

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    table: TableLabels
  }
}

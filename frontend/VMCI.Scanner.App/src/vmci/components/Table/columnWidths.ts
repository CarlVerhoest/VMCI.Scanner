/** Narrowest a column can be dragged to - still wide enough to grab the separator again. */
export const MIN_COLUMN_WIDTH = 40
const STORAGE_PREFIX = 'vmci-column-widths:'

export type ColumnWidths = Record<string, number>

/** Stored widths, or none. Storage can be unavailable or hold an older format: then none. */
export function loadColumnWidths(key: string | undefined): ColumnWidths {
  if (!key) return {}
  try {
    const parsed: unknown = JSON.parse(localStorage.getItem(STORAGE_PREFIX + key) ?? '{}')
    if (typeof parsed !== 'object' || parsed === null) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, number] =>
          typeof entry[1] === 'number' && Number.isFinite(entry[1]) && entry[1] >= MIN_COLUMN_WIDTH,
      ),
    )
  } catch {
    return {}
  }
}

export function saveColumnWidths(key: string | undefined, widths: ColumnWidths) {
  if (!key) return
  try {
    if (Object.keys(widths).length === 0) localStorage.removeItem(STORAGE_PREFIX + key)
    else localStorage.setItem(STORAGE_PREFIX + key, JSON.stringify(widths))
  } catch {
    // Not remembered this time; the widths still apply until the page is left.
  }
}

/** Inline style that pins a resized column to its width, overriding the `col` flex sizing. */
export function fixedWidthStyle(width: number | undefined) {
  return width === undefined ? undefined : { flex: `0 0 ${width}px`, width, maxWidth: width }
}

/** Case-insensitive "contains" on the cell's text. */
export function defaultFilter(cellValue: unknown, filter: string): boolean {
  if (cellValue === null || cellValue === undefined) return false
  return String(cellValue).toLowerCase().includes(filter.toLowerCase())
}

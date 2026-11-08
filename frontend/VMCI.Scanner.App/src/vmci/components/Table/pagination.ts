/** Page size meaning "all rows". */
export const ALL_ROWS = 0

/** Pages shown around the current one; gaps become `null` (an ellipsis). 0-based. */
export function pageWindow(pageIndex: number, pageCount: number, radius = 2): (number | null)[] {
  const pages = new Set<number>([0, pageCount - 1])
  for (let i = pageIndex - radius; i <= pageIndex + radius; i++) {
    if (i >= 0 && i < pageCount) pages.add(i)
  }
  const sorted = [...pages].sort((a, b) => a - b)
  const out: (number | null)[] = []
  sorted.forEach((page, i) => {
    if (i > 0 && page - sorted[i - 1]! > 1) out.push(null)
    out.push(page)
  })
  return out
}

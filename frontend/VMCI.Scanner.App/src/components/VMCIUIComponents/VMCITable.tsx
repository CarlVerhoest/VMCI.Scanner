import { KeyboardEvent, ReactNode, useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  Cell,
  ColumnDef,
  Header,
  SortingState,
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from '@tanstack/react-table'
import { Button, Col, Form, InputGroup, Row } from 'react-bootstrap'
import { ClearFilterIcon, SortIcon } from './icons'

type ColumnAccessor<T> =
  | { accessorKey: keyof T; accessorFn?: never }
  | { accessorKey?: never; accessorFn: (dataObject: T) => string | number | boolean | null | undefined }

export type VMCITableColumn<T> = ColumnAccessor<T> & {
  id: string
  header: string | (() => ReactNode)
  // rowIndex is this row's position among the currently displayed rows (i.e. after search
  // filtering/sorting, and within the current page) - e.g. useful for a "#" column. It is not
  // an identifier and is not stable across re-sorts/re-filters/page changes; use a real field
  // from T (or the row's own data) for anything that needs to stay tied to a specific row.
  cell?: (dataObject: T, rowIndex: number) => ReactNode
  enableSorting?: boolean
  enableFiltering?: boolean
  sortingFn?: (value1: unknown, value2: unknown, obj1: T, obj2: T) => number
  filterFn?: (dataObject: T, filterValue: string) => boolean
  onClick?: (dataObject: T) => void
  // Extra class(es) for this column's cells/header - merged with (not a replacement for) the
  // default cell classes (`text-start text-truncate my-auto`), so e.g. a responsive visibility
  // class like `d-none d-lg-block` is all a column needs; it doesn't also have to re-list the
  // defaults to keep truncation/vertical-centering.
  className?: string
  headerClassName?: string
  // For a column whose content is a fixed-size control (e.g. an action menu) rather than data -
  // sizes the column to its content (Bootstrap's `col-auto`, not the default flex-growing
  // `col`) and centers its content horizontally. Put this column last so it hugs the right edge
  // instead of stretching; leave at least one other column at its default flex-growing `col` so
  // it absorbs the remaining row width - see VMCIUIComponents/CLAUDE.md's "Action column"
  // pattern for the full rationale and an example.
  fitContent?: boolean
}

export interface VMCITableProps<T> {
  data: T[]
  columns: VMCITableColumn<T>[]
  enableFiltering?: boolean
  enableSorting?: boolean
  pageSize?: number
  emptyStateText?: string
  // Optional extra class(es) applied to a data row, e.g. to de-emphasize closed/archived records.
  rowClassName?: (dataObject: T) => string | undefined
  // Seeds the initial sort order (e.g. [{ id: 'projectNr', desc: true }]) so the table doesn't
  // default to the API's raw ordering. Only used to initialize state - users can still click
  // column headers afterward to change sorting away from this default.
  initialSorting?: SortingState
  // Optional content (e.g. a filter checkbox) rendered at the start of the search toolbar row,
  // vertically aligned with the search box on the same line rather than stacked above it.
  toolbarStart?: ReactNode
  // Fires on a double-click anywhere in a data row (e.g. to open that row's edit form). Rows
  // get a pointer cursor when this is set, as an affordance that they're double-clickable.
  onRowDoubleClick?: (dataObject: T) => void
}

const DEFAULT_CELL_CLASSES = clsx('text-start', 'text-truncate', 'my-auto')
// fitContent columns hold a fixed-size control (e.g. an action menu), not text - text-truncate
// would set overflow: hidden on the cell and clip a dropdown popup rendered inside it, so these
// get their own, narrower base (still vertically centered, just not text-oriented).
const FIT_CONTENT_CELL_CLASSES = clsx('my-auto')

// Client-side searchable/sortable/paginated table (TanStack Table under the
// hood) for datasets that are loaded in a single call - see VMCIUIComponents/CLAUDE.md.
export function VMCITable<T extends object>({
  data,
  columns,
  enableFiltering = true,
  enableSorting = true,
  pageSize = 20,
  emptyStateText = 'No data found',
  rowClassName,
  initialSorting = [],
  toolbarStart,
  onRowDoubleClick,
}: VMCITableProps<T>) {
  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>(initialSorting)
  // Keyed by row.id (TanStack's default: the row's position in the original `data` array, stable
  // across sort/filter/page changes) rather than display index, so the same underlying record
  // stays selected across re-sorting instead of "selection" silently following a screen position.
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  const mappedColumns = useMappedColumns(columns, enableFiltering, enableSorting)

  const table = useReactTable({
    data,
    columns: mappedColumns,
    initialState: { pagination: { pageSize } },
    state: { globalFilter, sorting },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    globalFilterFn: (row, _columnId, filterValue: string) => {
      if (!enableFiltering) return true

      return mappedColumns.some((column) => {
        if (!column.enableGlobalFilter || !column.id) return false

        const originalColumn = columns.find((col) => col.id === column.id)
        if (originalColumn?.filterFn) {
          return originalColumn.filterFn(row.original, filterValue)
        }

        const cellValue = row.getValue(column.id)
        return defaultFilteringFn(cellValue, filterValue)
      })
    },
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const pageCount = table.getPageCount()

  // Up/Down moves the selected-row highlight among the currently visible (sorted/filtered,
  // current page) rows - it does not cross a page boundary, so reaching the top/bottom row just
  // stops there rather than surprising the user with a page flip from a keypress. Ignored while
  // typing in a text control (the search box) so arrow keys keep doing their normal job there.
  const handleKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return

    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) return

    const rows = table.getRowModel().rows
    if (rows.length === 0) return

    e.preventDefault()
    const currentIndex = rows.findIndex((r) => r.id === selectedRowId)
    let nextIndex: number
    if (currentIndex === -1) {
      nextIndex = e.key === 'ArrowDown' ? 0 : rows.length - 1
    } else if (e.key === 'ArrowDown') {
      nextIndex = Math.min(currentIndex + 1, rows.length - 1)
    } else {
      nextIndex = Math.max(currentIndex - 1, 0)
    }
    setSelectedRowId(rows[nextIndex].id)
  }

  return (
    <div className="m-2" ref={containerRef} tabIndex={0} onKeyDown={handleKeyDown}>
      {(enableFiltering || toolbarStart) && (
        <div className="d-flex justify-content-between align-items-center mt-3 mb-2">
          <div>{toolbarStart}</div>
          {enableFiltering && (
            <InputGroup style={{ maxWidth: '18rem' }}>
              <Form.Control
                type="search"
                placeholder="Search all columns..."
                value={globalFilter}
                onChange={(e) => table.setGlobalFilter(e.target.value)}
                aria-label="Search"
              />
              <InputGroup.Text
                role="button"
                onClick={() => table.setGlobalFilter('')}
                title="Clear search"
              >
                <ClearFilterIcon />
              </InputGroup.Text>
            </InputGroup>
          )}
        </div>
      )}
      {(enableFiltering || toolbarStart) && <hr className="scanner-uicontrol-divider" />}

      <Row className="fw-bold">
        {table.getHeaderGroups().map((headerGroup) =>
          headerGroup.headers.map((header) => (
            <HeaderCell key={header.id} header={header} columns={columns} />
          ))
        )}
      </Row>
      <hr className="scanner-uicontrol-divider" />

      {pageCount === 0 ? (
        <Row>
          <Col className="text-center scanner-muted py-4">{emptyStateText}</Col>
        </Row>
      ) : (
        // displayIndex (this map's own index) drives the alternating stripe below - NOT
        // row.index, which TanStack sets once from the row's position in the original,
        // unsorted/unfiltered `data` array and never updates, so it goes stale (and the
        // striping desyncs from what's actually on screen) the moment the table is sorted,
        // filtered, or paginated away from its initial state.
        table.getRowModel().rows.map((row, displayIndex) => (
          <Row
            key={row.id}
            className={clsx(
              // Mutually exclusive with the alternating stripe (rather than layering both classes
              // and relying on CSS source order to pick a winner) - a selected row always shows
              // the selection color, striped or not.
              row.id === selectedRowId ? 'scanner-uicontrol-row-selected' : displayIndex % 2 === 0 && 'scanner-uicontrol-row-alt',
              // Every row is now click/double-click interactive (selection, and optionally
              // onRowDoubleClick), so always suppress the browser's native "select the word under
              // the cursor" behavior on double-click - otherwise double-clicking to open a row
              // also highlights text, which reads as broken.
              'user-select-none',
              rowClassName?.(row.original)
            )}
            // Every row is clickable now (selection), not just double-clickable ones - always a
            // pointer, not conditional on onRowDoubleClick being set.
            style={{ cursor: 'pointer' }}
            // A single click selects (and re-focuses the table so arrow keys keep working right
            // after a mouse click); a double click fires this same click first (selecting the
            // row) and then onRowDoubleClick (opening it) - no separate wiring needed for
            // "double-click also selects".
            onClick={() => {
              setSelectedRowId(row.id)
              containerRef.current?.focus()
            }}
            onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row.original) : undefined}
          >
            {row.getVisibleCells().map((cell) => (
              <BodyCell key={cell.id} cell={cell} columns={columns} displayIndex={displayIndex} />
            ))}
          </Row>
        ))
      )}
      <hr className="scanner-uicontrol-divider" />

      {pageCount > 1 && (
        <div className="d-flex align-items-center justify-content-between mt-3">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            Previous
          </Button>

          <span className="scanner-muted small">
            Page {table.getState().pagination.pageIndex + 1} of {pageCount}
          </span>

          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  )
}

function HeaderCell<T>({ header, columns }: { header: Header<T, unknown>; columns: VMCITableColumn<T>[] }) {
  const originalColumn = columns.find((col) => col.id === header.column.id)
  const fitContent = originalColumn?.fitContent
  const classNames = clsx(
    fitContent ? FIT_CONTENT_CELL_CLASSES : DEFAULT_CELL_CLASSES,
    originalColumn?.headerClassName ?? originalColumn?.className
  )

  const canSort = header.column.getCanSort()
  const sortDirection = header.column.getIsSorted()

  return (
    <Col
      xs={fitContent ? 'auto' : undefined}
      className={clsx(classNames, canSort && 'user-select-none', fitContent && 'd-flex justify-content-center')}
      role={canSort ? 'button' : undefined}
      style={{ cursor: canSort ? 'pointer' : 'default' }}
      onClick={header.column.getToggleSortingHandler()}
    >
      {flexRender(header.column.columnDef.header, header.getContext())}
      {canSort && (
        <>
          {' '}
          <SortIcon state={sortDirection === 'asc' ? 'asc' : sortDirection === 'desc' ? 'desc' : 'unsorted'} />
        </>
      )}
    </Col>
  )
}

function BodyCell<T>({
  cell,
  columns,
  displayIndex,
}: {
  cell: Cell<T, unknown>
  columns: VMCITableColumn<T>[]
  displayIndex: number
}) {
  const originalColumn = columns.find((col) => col.id === cell.column.id)
  const fitContent = originalColumn?.fitContent
  const classNames = clsx(fitContent ? FIT_CONTENT_CELL_CLASSES : DEFAULT_CELL_CLASSES, originalColumn?.className)

  // Rendered directly from originalColumn.cell here (with the caller-supplied displayIndex)
  // rather than via flexRender(cell.column.columnDef.cell, ...) - TanStack's own Cell.row.index
  // is the row's position in the original unsorted/unfiltered data, not its current on-screen
  // position, so a columnDef-level wrapper has no correct index to hand a custom cell renderer.
  const content = originalColumn?.cell
    ? originalColumn.cell(cell.row.original, displayIndex)
    : ((cell.getValue() as ReactNode) ?? null)

  return (
    <Col
      xs={fitContent ? 'auto' : undefined}
      className={clsx(classNames, fitContent && 'd-flex justify-content-center')}
      style={{ cursor: originalColumn?.onClick ? 'pointer' : 'default' }}
      onClick={() => originalColumn?.onClick?.(cell.row.original)}
    >
      {content}
    </Col>
  )
}

function useMappedColumns<T>(
  columns: VMCITableColumn<T>[],
  enableFilteringGlobal: boolean,
  enableSortingGlobal: boolean
): ColumnDef<T>[] {
  return useMemo(
    () =>
      columns.map((col): ColumnDef<T> => {
        const columnDef: ColumnDef<T> = {
          id: col.id,
          accessorKey: col.accessorKey as string,
          accessorFn: col.accessorFn,
          header: typeof col.header === 'function' ? col.header : () => col.header,
          // No `cell` here - BodyCell renders col.cell/getValue() directly instead of going
          // through flexRender(columnDef.cell, ...), since a per-row rowIndex has to come from
          // BodyCell's own displayIndex (see its comment) and can't be derived correctly inside
          // this per-column, not-per-row, columnDef wrapper.
          enableGlobalFilter: enableFilteringGlobal && col.enableFiltering !== false,
          enableSorting: enableSortingGlobal && col.enableSorting !== false,
        }

        if (col.sortingFn) {
          const customSortingFn = col.sortingFn
          columnDef.sortingFn = (row1, row2, columnId) =>
            customSortingFn(row1.getValue(columnId), row2.getValue(columnId), row1.original, row2.original)
        }

        return columnDef
      }),
    [columns, enableFilteringGlobal, enableSortingGlobal]
  )
}

function defaultFilteringFn(cellValue: unknown, filterValue: string): boolean {
  if (cellValue === null || cellValue === undefined) return false
  return String(cellValue).toLowerCase().includes(filterValue.toLowerCase())
}

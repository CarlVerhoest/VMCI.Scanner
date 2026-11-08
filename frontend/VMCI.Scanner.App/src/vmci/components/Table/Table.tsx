import {
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type KeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import {
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type Row,
  type SortingState,
} from '@tanstack/react-table'
import { faArrowDown, faArrowUp, faArrowsLeftRightToLine } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useBreakpointUp, type Breakpoint } from '../../hooks/useMediaQuery'
import { EmptyState } from '../EmptyState/EmptyState'
import { displayValue, headerText, keyOfRow, renderHeader, type RowKey } from '../List/dataUtils'
import { SearchInput } from '../SearchInput/SearchInput'
import { useLabels } from '../VMCIProvider/vmciContext'
import {
  MIN_COLUMN_WIDTH,
  defaultFilter,
  fixedWidthStyle,
  loadColumnWidths,
  saveColumnWidths,
  type ColumnWidths,
} from './columnWidths'
import { tableLabels, type TableLabels } from './Table.labels'
import { ALL_ROWS } from './pagination'
import { TablePagination } from './TablePagination'
import '../List/dataLayout.css'
import './Table.css'

type CellValue = string | number | boolean | null | undefined

type ColumnAccessor<T> =
  | { accessorKey: keyof T; accessorFn?: never }
  | { accessorKey?: never; accessorFn: (row: T) => CellValue }
  | { accessorKey?: never; accessorFn?: never }

export type TableColumn<T> = ColumnAccessor<T> & {
  id: string
  header: string | (() => ReactNode)
  /** Custom cell content; `displayIndex` is the position on screen (not an identifier). */
  cell?: (row: T, displayIndex: number) => ReactNode
  enableSorting?: boolean
  enableFiltering?: boolean
  sortingFn?: (value1: unknown, value2: unknown, row1: T, row2: T) => number
  filterFn?: (row: T, filter: string) => boolean
  /** Click on this column's cell (in addition to the row click). */
  onClick?: (row: T) => void
  /** Extra classes for the cells (merged), e.g. `d-none d-lg-block` to drop on small screens. */
  className?: string
  headerClassName?: string
  /** A control (e.g. ActionMenu): sized to its content, never resized; in cards top-right. */
  fitContent?: boolean
}

export interface TableSort {
  id: string
  desc: boolean
}

export interface TableProps<T> extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'children' | 'onClick'
> {
  data: readonly T[]
  columns: readonly TableColumn<T>[]
  /**
   * Property or function giving a stable key per row. Recommended: selection then follows the
   * record when the data is reloaded. Default: the position in `data`.
   */
  rowKey?: RowKey<T>
  enableFiltering?: boolean
  enableSorting?: boolean
  /** Rows per page. Default 20. */
  pageSize?: number
  /** Let the user choose the page size; `0` means all rows. */
  pageSizeOptions?: readonly number[]
  /** Starting sort order, e.g. `[{ id: 'date', desc: true }]`. */
  initialSorting?: readonly TableSort[]
  rowClassName?: (row: T) => string | undefined
  /** Content at the start of the toolbar, next to the search box. */
  toolbarStart?: ReactNode
  /** Single click on a row (not on a control inside it). The row is selected first. */
  onRowClick?: (row: T) => void
  /** Double click, or Enter on the selected row. */
  onRowDoubleClick?: (row: T) => void
  /** Controlled selection; leave undefined to let the table keep it. */
  selectedRow?: T | null
  onSelectionChanged?: (row: T | null) => void
  /** Drag column edges to resize; double-click to fit. Default true. */
  enableColumnResizing?: boolean
  /** Remember resized widths in this browser under this name. Without it they are not stored. */
  columnWidthsStorageKey?: string
  /** Below this breakpoint the rows become cards. `false`: always rows. Default `md`. */
  cardBreakpoint?: Breakpoint | false
  /** Replaces the default empty message. */
  emptyState?: ReactNode
  /** Overrides the default texts. */
  labels?: Partial<TableLabels>
}

/**
 * Client-side table for data loaded in one call: search across columns, sort, pages,
 * row selection (click, ↑/↓, Enter opens) and resizable columns. Becomes cards on phones.
 */
export function Table<T>({
  data,
  columns,
  rowKey,
  enableFiltering = true,
  enableSorting = true,
  pageSize = 20,
  pageSizeOptions,
  initialSorting = [],
  rowClassName,
  toolbarStart,
  onRowClick,
  onRowDoubleClick,
  selectedRow,
  onSelectionChanged,
  enableColumnResizing = true,
  columnWidthsStorageKey,
  cardBreakpoint = 'md',
  emptyState,
  labels,
  className,
  ...rest
}: TableProps<T>) {
  const text = useLabels('table', tableLabels, labels)
  const wide = useBreakpointUp(cardBreakpoint)
  const sortSelectId = useId()
  const gridId = useId()
  const rowDomId = (id: string) => `${gridId}-row-${id}`
  const containerRef = useRef<HTMLDivElement>(null)

  const [globalFilter, setGlobalFilter] = useState('')
  const [sorting, setSorting] = useState<SortingState>(() => [...initialSorting])
  const [pagination, setPagination] = useState({ pageIndex: 0, pageSize: pageSize || 1e9 })
  useEffect(() => {
    setPagination({ pageIndex: 0, pageSize: pageSize === ALL_ROWS ? 1e9 : pageSize })
  }, [pageSize])

  const columnsById = useMemo(() => new Map(columns.map((c) => [c.id, c])), [columns])

  // Selection by row id (the row key), so it follows the record across sorting and reloads.
  const getRowId = (row: T, index: number) => keyOfRow(row, index, rowKey)
  const [internalSelectedId, setInternalSelectedId] = useState<string | null>(null)
  const controlled = selectedRow !== undefined
  const selectedId = controlled
    ? selectedRow === null
      ? null
      : rowKey !== undefined
        ? keyOfRow(selectedRow, 0, rowKey)
        : String(data.indexOf(selectedRow))
    : internalSelectedId

  const select = (row: Row<T> | null) => {
    if (!controlled) setInternalSelectedId(row?.id ?? null)
    if ((row?.id ?? null) !== selectedId) onSelectionChanged?.(row?.original ?? null)
  }

  // ---- column widths ----
  const [columnWidths, setColumnWidths] = useState<ColumnWidths>(() =>
    enableColumnResizing ? loadColumnWidths(columnWidthsStorageKey) : {},
  )
  const [resizingId, setResizingId] = useState<string | null>(null)
  const suppressSortClick = useRef(false)
  useEffect(() => {
    if (enableColumnResizing && resizingId === null)
      saveColumnWidths(columnWidthsStorageKey, columnWidths)
  }, [enableColumnResizing, resizingId, columnWidthsStorageKey, columnWidths])

  function startResize(columnId: string, headerElement: HTMLElement, startX: number) {
    const startWidth = headerElement.getBoundingClientRect().width
    let moved = false
    setResizingId(columnId)
    const previousCursor = document.body.style.cursor
    const previousSelect = document.body.style.userSelect
    document.body.style.cursor = 'col-resize'
    document.body.style.userSelect = 'none'
    const onMove = (e: MouseEvent) => {
      const delta = e.clientX - startX
      if (!moved && Math.abs(delta) < 2) return
      moved = true
      const width = Math.max(MIN_COLUMN_WIDTH, Math.round(startWidth + delta))
      setColumnWidths((current) => ({ ...current, [columnId]: width }))
    }
    const onUp = () => {
      window.removeEventListener('mousemove', onMove)
      window.removeEventListener('mouseup', onUp)
      document.body.style.cursor = previousCursor
      document.body.style.userSelect = previousSelect
      setResizingId(null)
      if (moved) {
        // The click that ends a drag lands on the header and would toggle its sorting.
        suppressSortClick.current = true
        window.setTimeout(() => (suppressSortClick.current = false), 0)
      }
    }
    window.addEventListener('mousemove', onMove)
    window.addEventListener('mouseup', onUp)
  }

  // Fit a column to its widest visible cell: lay each out at max-content, measure, restore.
  function fitToContent(columnId: string) {
    const cells = Array.from(
      containerRef.current?.querySelectorAll<HTMLElement>('[data-vmci-col]') ?? [],
    ).filter((el) => el.dataset.vmciCol === columnId)
    if (cells.length === 0) return
    const saved = cells.map((el) => [el.style.flex, el.style.width, el.style.maxWidth] as const)
    cells.forEach((el) => {
      el.style.flex = '0 0 auto'
      el.style.width = 'max-content'
      el.style.maxWidth = 'none'
    })
    const widest = Math.max(...cells.map((el) => el.getBoundingClientRect().width))
    cells.forEach((el, i) => {
      ;[el.style.flex, el.style.width, el.style.maxWidth] = saved[i]!
    })
    setColumnWidths((c) => ({
      ...c,
      [columnId]: Math.max(MIN_COLUMN_WIDTH, Math.ceil(widest) + 1),
    }))
  }

  const hasFixedWidths = wide && enableColumnResizing && Object.keys(columnWidths).length > 0

  // ---- TanStack ----
  const columnDefs = useMemo<ColumnDef<T>[]>(
    () =>
      columns.map((col) => {
        const def: ColumnDef<T> = {
          id: col.id,
          accessorFn: col.accessorFn
            ? col.accessorFn
            : col.accessorKey !== undefined
              ? (row: T) => row[col.accessorKey as keyof T] as CellValue
              : () => null,
          enableGlobalFilter: enableFiltering && col.enableFiltering !== false,
          enableSorting:
            enableSorting &&
            col.enableSorting !== false &&
            !col.fitContent &&
            (col.accessorKey !== undefined || col.accessorFn !== undefined || !!col.sortingFn),
        }
        if (col.sortingFn) {
          const fn = col.sortingFn
          def.sortingFn = (a, b, id) => fn(a.getValue(id), b.getValue(id), a.original, b.original)
        }
        return def
      }),
    [columns, enableFiltering, enableSorting],
  )

  // TanStack Table returns new functions every render; the React Compiler skips this component.
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: data as T[],
    columns: columnDefs,
    getRowId,
    // The first click always sorts ascending (TanStack's default is descending for numbers).
    sortDescFirst: false,
    state: { globalFilter, sorting, pagination },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    onPaginationChange: setPagination,
    globalFilterFn: (row, _columnId, filter: string) =>
      columns.some((col) => {
        if (!enableFiltering || col.enableFiltering === false) return false
        if (col.filterFn) return col.filterFn(row.original, filter)
        return defaultFilter(row.getValue(col.id), filter)
      }),
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  })

  const rows = table.getRowModel().rows
  const pageCount = table.getPageCount()

  // ---- interaction ----
  function onRowMouseClick(event: ReactMouseEvent<HTMLElement>, row: Row<T>) {
    select(row)
    containerRef.current?.focus({ preventScroll: true })
    if (onRowClick && !isInsideControl(event.target, event.currentTarget)) onRowClick(row.original)
  }

  // ↑/↓ move the selection within the page; Enter opens the selected row.
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const target = e.target as HTMLElement
    if (target !== e.currentTarget) return
    if (rows.length === 0) return
    const current = rows.findIndex((r) => r.id === selectedId)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const next =
        current === -1
          ? e.key === 'ArrowDown'
            ? 0
            : rows.length - 1
          : Math.min(Math.max(current + (e.key === 'ArrowDown' ? 1 : -1), 0), rows.length - 1)
      select(rows[next]!)
    } else if (e.key === 'Enter' && current !== -1) {
      e.preventDefault()
      const open = onRowDoubleClick ?? onRowClick
      open?.(rows[current]!.original)
    }
  }

  // Keep the selected row in view when moving with the keyboard.
  useLayoutEffect(() => {
    if (!selectedId) return
    containerRef.current
      ?.querySelector(`[data-vmci-row="${CSS.escape(selectedId)}"]`)
      ?.scrollIntoView?.({ block: 'nearest' })
  }, [selectedId])

  const cellContent = (row: Row<T>, displayIndex: number, col: TableColumn<T>): ReactNode =>
    col.cell ? col.cell(row.original, displayIndex) : displayValue(row.getValue(col.id))

  const sortableColumns = columns.filter((c) => table.getColumn(c.id)?.getCanSort())
  const currentSort = sorting[0]
  const empty =
    emptyState ??
    (globalFilter && data.length > 0 ? (
      <EmptyState size="sm" title={text.noResults} />
    ) : (
      <EmptyState size="sm" title={text.empty} />
    ))

  const showToolbar =
    enableFiltering || toolbarStart || hasFixedWidths || (!wide && sortableColumns.length > 0)

  return (
    <div
      ref={containerRef}
      role="grid"
      tabIndex={0}
      aria-rowcount={table.getFilteredRowModel().rows.length}
      // Focus stays on the grid; ↑/↓ move the selected row, announced via activedescendant.
      aria-activedescendant={
        selectedId && rows.some((r) => r.id === selectedId) ? rowDomId(selectedId) : undefined
      }
      {...rest}
      className={clsx('vmci-data vmci-table', className)}
      onKeyDown={onKeyDown}
    >
      {showToolbar && (
        <div className="vmci-table__toolbar">
          <div className="vmci-table__toolbar-start">{toolbarStart}</div>
          {!wide && sortableColumns.length > 0 && (
            <div className="d-flex align-items-center gap-2">
              <label htmlFor={sortSelectId} className="small mb-0 text-nowrap vmci-muted">
                {text.sortBy}
              </label>
              <select
                id={sortSelectId}
                className="form-select form-select-sm"
                value={currentSort ? `${currentSort.id}:${currentSort.desc ? 'desc' : 'asc'}` : ''}
                onChange={(e) => {
                  const [id, dir] = e.target.value.split(':')
                  setSorting(id ? [{ id, desc: dir === 'desc' }] : [])
                }}
              >
                <option value="">{text.noSorting}</option>
                {sortableColumns.flatMap((c) => {
                  const name = headerText(c.header) || c.id
                  return [
                    <option key={`${c.id}:asc`} value={`${c.id}:asc`}>
                      {text.ascending(name)}
                    </option>,
                    <option key={`${c.id}:desc`} value={`${c.id}:desc`}>
                      {text.descending(name)}
                    </option>,
                  ]
                })}
              </select>
            </div>
          )}
          {hasFixedWidths && (
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary text-nowrap"
              onClick={() => setColumnWidths({})}
              title={text.resetWidthsTitle}
            >
              <FontAwesomeIcon icon={faArrowsLeftRightToLine} className="me-1" aria-hidden="true" />
              {text.resetWidths}
            </button>
          )}
          {enableFiltering && (
            <SearchInput
              size="sm"
              wrapperClassName="vmci-table__search"
              value={globalFilter}
              onValueChanged={(v) => table.setGlobalFilter(v)}
              labels={{ label: text.search, placeholder: text.searchPlaceholder }}
            />
          )}
        </div>
      )}

      {wide ? (
        <div className={clsx(hasFixedWidths && 'vmci-table__scroller')}>
          <div
            style={hasFixedWidths ? { minWidth: minGridWidth(columns, columnWidths) } : undefined}
          >
            <div
              role="row"
              className={clsx('row vmci-data__header', hasFixedWidths && 'flex-nowrap')}
            >
              {table.getHeaderGroups()[0]!.headers.map((header) => {
                const col = columnsById.get(header.id)!
                const canSort = header.column.getCanSort()
                const dir = header.column.getIsSorted()
                const resizable = enableColumnResizing && !col.fitContent
                return (
                  <div
                    key={header.id}
                    role="columnheader"
                    aria-sort={
                      dir === 'asc'
                        ? 'ascending'
                        : dir === 'desc'
                          ? 'descending'
                          : canSort
                            ? 'none'
                            : undefined
                    }
                    data-vmci-col={header.id}
                    className={clsx(
                      col.fitContent
                        ? 'col-auto vmci-data__cell vmci-data__cell--fit'
                        : 'col vmci-data__cell',
                      resizable && 'position-relative',
                      col.headerClassName ?? col.className,
                    )}
                    style={fixedWidthStyle(columnWidths[header.id])}
                  >
                    {canSort ? (
                      <button
                        type="button"
                        className="vmci-table__sort"
                        onClick={(e) => {
                          if (suppressSortClick.current) return
                          header.column.getToggleSortingHandler()?.(e)
                        }}
                      >
                        <span className="text-truncate">{renderHeader(col.header)}</span>
                        <FontAwesomeIcon
                          icon={dir === 'desc' ? faArrowDown : faArrowUp}
                          className={clsx(
                            'vmci-table__sort-icon',
                            !dir && 'vmci-table__sort-icon--idle',
                          )}
                          aria-hidden="true"
                        />
                      </button>
                    ) : (
                      renderHeader(col.header)
                    )}
                    {resizable && (
                      <span
                        aria-hidden="true"
                        className={clsx(
                          'vmci-table__resizer',
                          resizingId === header.id && 'vmci-table__resizer--active',
                        )}
                        title={text.resizeColumn}
                        onMouseDown={(e) => {
                          if (e.button !== 0) return
                          e.preventDefault()
                          e.stopPropagation()
                          const headerEl = e.currentTarget.parentElement
                          if (headerEl) startResize(header.id, headerEl, e.clientX)
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onDoubleClick={(e) => {
                          e.stopPropagation()
                          fitToContent(header.id)
                        }}
                      />
                    )}
                  </div>
                )
              })}
            </div>
            <hr className="vmci-data__divider" />
            {rows.length === 0 ? (
              <div role="row">
                <div role="gridcell">{empty}</div>
              </div>
            ) : (
              rows.map((row, displayIndex) => (
                // Rows are reached through the grid's focus and arrow keys (activedescendant).
                // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                <div
                  key={row.id}
                  id={rowDomId(row.id)}
                  role="row"
                  data-vmci-row={row.id}
                  aria-selected={row.id === selectedId}
                  className={clsx(
                    'row vmci-data__row vmci-data__row--interactive',
                    row.id === selectedId
                      ? 'vmci-data__row--selected'
                      : displayIndex % 2 === 0 && 'vmci-data__row--alt',
                    hasFixedWidths && 'flex-nowrap',
                    rowClassName?.(row.original),
                  )}
                  onClick={(e) => onRowMouseClick(e, row)}
                  onDoubleClick={
                    onRowDoubleClick ? () => onRowDoubleClick(row.original) : undefined
                  }
                >
                  {columns.map((col) => (
                    // A column click is a mouse shortcut; Enter on the row opens it too.
                    // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                    <div
                      key={col.id}
                      role="gridcell"
                      data-vmci-col={col.id}
                      className={clsx(
                        col.fitContent
                          ? 'col-auto vmci-data__cell vmci-data__cell--fit'
                          : 'col vmci-data__cell',
                        col.className,
                      )}
                      style={{
                        ...fixedWidthStyle(columnWidths[col.id]),
                        cursor: col.onClick ? 'pointer' : undefined,
                      }}
                      onClick={col.onClick ? () => col.onClick!(row.original) : undefined}
                    >
                      {cellContent(row, displayIndex, col)}
                    </div>
                  ))}
                </div>
              ))
            )}
            <hr className="vmci-data__divider" />
          </div>
        </div>
      ) : rows.length === 0 ? (
        empty
      ) : (
        <div className="vmci-data__cards" role="rowgroup">
          {rows.map((row, displayIndex) => {
            const fields = columns.filter((c) => !c.fitContent)
            const controls = columns.filter((c) => c.fitContent)
            return (
              // Rows are reached through the grid's focus and arrow keys (activedescendant).
              // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
              <div
                key={row.id}
                id={rowDomId(row.id)}
                role="row"
                data-vmci-row={row.id}
                aria-selected={row.id === selectedId}
                className={clsx(
                  'vmci-data__card vmci-data__row--interactive',
                  row.id === selectedId && 'vmci-data__row--selected',
                  rowClassName?.(row.original),
                )}
                onClick={(e) => onRowMouseClick(e, row)}
                onDoubleClick={onRowDoubleClick ? () => onRowDoubleClick(row.original) : undefined}
              >
                {fields.map((col, i) => (
                  // A column click is a mouse shortcut; Enter on the row opens it too.
                  // eslint-disable-next-line jsx-a11y/click-events-have-key-events, jsx-a11y/interactive-supports-focus
                  <div
                    key={col.id}
                    role="gridcell"
                    className={clsx(
                      'vmci-data__card-field',
                      i === 0 && 'vmci-data__card-field--title',
                      col.className,
                    )}
                    onClick={col.onClick ? () => col.onClick!(row.original) : undefined}
                  >
                    <span className="vmci-data__card-label">{renderHeader(col.header)}</span>
                    <span className="vmci-data__card-value">
                      {cellContent(row, displayIndex, col)}
                    </span>
                  </div>
                ))}
                {controls.length > 0 && (
                  <div className="vmci-data__card-actions" role="gridcell">
                    {controls.map((col) => (
                      <span key={col.id}>{cellContent(row, displayIndex, col)}</span>
                    ))}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}

      <TablePagination
        pageIndex={pagination.pageIndex}
        pageCount={pageCount}
        onPageChange={(i) => table.setPageIndex(i)}
        pageSize={pagination.pageSize >= 1e9 ? ALL_ROWS : pagination.pageSize}
        pageSizeOptions={pageSizeOptions}
        onPageSizeChange={(size) =>
          setPagination({ pageIndex: 0, pageSize: size === ALL_ROWS ? 1e9 : size })
        }
        compact={!wide}
        text={text}
      />
    </div>
  )
}

/** Lower bound for the grid width once columns are fixed, so stripes span the scroll width. */
function minGridWidth<T>(columns: readonly TableColumn<T>[], widths: ColumnWidths): number {
  return columns.reduce(
    (total, c) => total + (widths[c.id] ?? (c.fitContent ? 48 : 2 * MIN_COLUMN_WIDTH)),
    0,
  )
}

/**
 * A click on a control inside a row (action menu, link, button, field) belongs to that control.
 * Also covers content a control renders in a portal: React bubbles those clicks through the row.
 */
function isInsideControl(target: EventTarget, row: Element): boolean {
  if (!(target instanceof Element)) return false
  if (!row.contains(target)) return true
  return (
    target.closest(
      'a, button, input, select, textarea, label, [role="menu"], [role="menuitem"], .dropdown',
    ) !== null
  )
}

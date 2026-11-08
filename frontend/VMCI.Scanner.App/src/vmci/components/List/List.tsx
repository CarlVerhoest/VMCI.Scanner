import type { ComponentPropsWithoutRef, KeyboardEvent, ReactNode } from 'react'
import clsx from 'clsx'
import { useBreakpointUp, type Breakpoint } from '../../hooks/useMediaQuery'
import { EmptyState } from '../EmptyState/EmptyState'
import { useLabels } from '../VMCIProvider/vmciContext'
import { listLabels, type ListLabels } from './List.labels'
import { displayValue, keyOfRow, renderHeader, type RowKey } from './dataUtils'
import './dataLayout.css'

export interface ListColumn<T> {
  id: string
  header?: ReactNode | (() => ReactNode)
  /** Property shown in the cell (when there is no `cell`). */
  accessorKey?: keyof T
  /** Custom cell content. */
  cell?: (row: T, index: number) => ReactNode
  /** Extra classes for the cells, e.g. `d-none d-lg-block` to hide on small screens. */
  className?: string
  headerClassName?: string
  /** A control (e.g. ActionMenu): sized to its content; in cards it goes top-right. */
  fitContent?: boolean
}

export interface ListProps<T> extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  data: readonly T[]
  columns: readonly ListColumn<T>[]
  showHeader?: boolean
  /** Property or function giving a stable key per row. Default: the index. */
  rowKey?: RowKey<T>
  rowClassName?: (row: T) => string | undefined
  onRowClick?: (row: T) => void
  /** Below this breakpoint the rows become cards. `false`: always rows. Default `md`. */
  cardBreakpoint?: Breakpoint | false
  /** Replaces the default empty message. */
  emptyState?: ReactNode
  /** Overrides the default texts. */
  labels?: Partial<ListLabels>
}

/** Simple rows and columns for small datasets (no sorting, search or pages: see Table). */
export function List<T>({
  data,
  columns,
  showHeader = true,
  rowKey,
  rowClassName,
  onRowClick,
  cardBreakpoint = 'md',
  emptyState,
  labels,
  className,
  ...rest
}: ListProps<T>) {
  const text = useLabels('list', listLabels, labels)
  const wide = useBreakpointUp(cardBreakpoint)
  const cellContent = (column: ListColumn<T>, row: T, index: number): ReactNode =>
    column.cell
      ? column.cell(row, index)
      : column.accessorKey !== undefined
        ? displayValue(row[column.accessorKey])
        : null

  const empty = emptyState ?? <EmptyState size="sm" title={text.empty} />

  // Clickable rows are reachable with Tab and open with Enter or Space.
  const interaction = (row: T) =>
    onRowClick
      ? {
          tabIndex: 0,
          onClick: () => onRowClick(row),
          onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
            if (e.target !== e.currentTarget || (e.key !== 'Enter' && e.key !== ' ')) return
            e.preventDefault()
            onRowClick(row)
          },
        }
      : {}

  if (!wide) {
    const fields = columns.filter((c) => !c.fitContent)
    const controls = columns.filter((c) => c.fitContent)
    return (
      <div {...rest} className={clsx('vmci-data vmci-list', className)}>
        {data.length === 0 ? (
          empty
        ) : (
          <ul className="list-unstyled vmci-data__cards mb-0">
            {data.map((row, index) => (
              <li
                key={keyOfRow(row, index, rowKey)}
                className={clsx(
                  'vmci-data__card',
                  onRowClick && 'vmci-data__row--interactive',
                  rowClassName?.(row),
                )}
                {...interaction(row)}
              >
                {fields.map((column, i) => (
                  <div
                    key={column.id}
                    className={clsx(
                      'vmci-data__card-field',
                      i === 0 && 'vmci-data__card-field--title',
                      column.className,
                    )}
                  >
                    {column.header !== undefined && (
                      <span className="vmci-data__card-label">{renderHeader(column.header)}</span>
                    )}
                    <span className="vmci-data__card-value">{cellContent(column, row, index)}</span>
                  </div>
                ))}
                {controls.length > 0 && (
                  <div className="vmci-data__card-actions">
                    {controls.map((column) => (
                      <span key={column.id}>{cellContent(column, row, index)}</span>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    )
  }

  return (
    <div role="table" {...rest} className={clsx('vmci-data vmci-list', className)}>
      {showHeader && (
        <div role="rowgroup">
          <div role="row" className="row vmci-data__header">
            {columns.map((column) => (
              <div
                key={column.id}
                role="columnheader"
                className={clsx(
                  column.fitContent
                    ? 'col-auto vmci-data__cell vmci-data__cell--fit'
                    : 'col vmci-data__cell',
                  column.headerClassName ?? column.className,
                )}
              >
                {column.header !== undefined && renderHeader(column.header)}
              </div>
            ))}
          </div>
        </div>
      )}
      <hr className="vmci-data__divider" />
      <div role="rowgroup">
        {data.length === 0 ? (
          <div role="row">
            <div role="cell">{empty}</div>
          </div>
        ) : (
          data.map((row, index) => (
            <div
              key={keyOfRow(row, index, rowKey)}
              role="row"
              className={clsx(
                'row vmci-data__row',
                index % 2 === 0 && 'vmci-data__row--alt',
                onRowClick && 'vmci-data__row--interactive',
                rowClassName?.(row),
              )}
              {...interaction(row)}
            >
              {columns.map((column) => (
                <div
                  key={column.id}
                  role="cell"
                  className={clsx(
                    column.fitContent
                      ? 'col-auto vmci-data__cell vmci-data__cell--fit'
                      : 'col vmci-data__cell',
                    column.className,
                  )}
                >
                  {cellContent(column, row, index)}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <hr className="vmci-data__divider" />
    </div>
  )
}

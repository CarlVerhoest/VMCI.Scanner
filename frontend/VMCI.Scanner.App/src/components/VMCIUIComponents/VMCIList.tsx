import { ReactNode } from 'react'
import clsx from 'clsx'
import { Col, Row } from 'react-bootstrap'

type Header = string | (() => ReactNode) | null | undefined
type Cell<T> = string | ((dataObject: T) => ReactNode) | null | undefined

export interface VMCIListColumn<T> {
  id: string

  header?: Header
  cell?: Cell<T>

  // Extra class(es) for this column's cells/header - merged with (not a replacement for) the
  // default cell classes (`text-start text-truncate my-auto`).
  className?: string
  headerClassName?: string
}

export interface VMCIListProps<T> {
  data: T[]
  columns: VMCIListColumn<T>[]
  showHeader?: boolean
  emptyStateText?: string
}

const DEFAULT_CELL_CLASSES = clsx('text-start', 'text-truncate', 'my-auto')

// Simple non-virtualized row/column list (Bootstrap grid based), for small
// datasets that don't need VMCITable's sorting/filtering/pagination.
export function VMCIList<T extends object>({
  data,
  columns,
  showHeader = true,
  emptyStateText = 'No data found',
}: VMCIListProps<T>) {
  return (
    <div className="m-2">
      {showHeader && (
        <Row className="fw-bold">
          {columns.map((column) => (
            <Col key={column.id} className={clsx(DEFAULT_CELL_CLASSES, column.headerClassName ?? column.className)}>
              {renderHeader(column.header)}
            </Col>
          ))}
        </Row>
      )}
      <hr className="scanner-uicontrol-divider" />

      {data.length === 0 ? (
        <EmptyState text={emptyStateText} />
      ) : (
        data.map((dataObject, index) => (
          <Row key={index} className={index % 2 === 0 ? 'scanner-uicontrol-row-alt' : undefined}>
            {columns.map((column) => (
              <Col key={column.id} className={clsx(DEFAULT_CELL_CLASSES, column.className)}>
                {renderCell(column.cell, dataObject)}
              </Col>
            ))}
          </Row>
        ))
      )}
      <hr className="scanner-uicontrol-divider" />
    </div>
  )
}

function renderHeader(header: Header): ReactNode {
  if (!header) return null
  return typeof header === 'function' ? header() : header
}

function renderCell<T>(cell: Cell<T>, dataObject: T): ReactNode {
  if (!cell) return null

  if (typeof cell === 'function') {
    return cell(dataObject)
  }

  // String cells double as a property accessor when they match a key on the row,
  // otherwise they're rendered as a literal (e.g. a static label column).
  if (typeof dataObject === 'object' && dataObject !== null && cell in dataObject) {
    const value = (dataObject as Record<string, unknown>)[cell]
    return value === null || value === undefined ? null : String(value)
  }

  return cell
}

function EmptyState({ text }: { text: string }) {
  return (
    <Row>
      <Col className="text-center scanner-muted py-4">{text}</Col>
    </Row>
  )
}

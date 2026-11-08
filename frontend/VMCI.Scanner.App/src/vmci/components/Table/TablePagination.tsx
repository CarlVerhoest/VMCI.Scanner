import { useId, type ReactNode } from 'react'
import clsx from 'clsx'
import {
  faAnglesLeft,
  faAnglesRight,
  faChevronLeft,
  faChevronRight,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { ALL_ROWS, pageWindow } from './pagination'
import type { TableLabels } from './Table.labels'

interface TablePaginationProps {
  pageIndex: number
  pageCount: number
  onPageChange: (pageIndex: number) => void
  pageSize: number
  pageSizeOptions?: readonly number[]
  onPageSizeChange: (size: number) => void
  /** Only previous / "page x of y" / next, for narrow screens. */
  compact: boolean
  text: TableLabels
}

export function TablePagination({
  pageIndex,
  pageCount,
  onPageChange,
  pageSize,
  pageSizeOptions,
  onPageSizeChange,
  compact,
  text,
}: TablePaginationProps) {
  const sizeId = useId()
  const isFirst = pageIndex <= 0
  const isLast = pageIndex >= pageCount - 1

  const sizeChooser = pageSizeOptions && pageSizeOptions.length > 0 && (
    <div className="d-flex align-items-center gap-2">
      <label htmlFor={sizeId} className="small text-nowrap mb-0 vmci-muted">
        {text.pageSize}
      </label>
      <select
        id={sizeId}
        className="form-select form-select-sm w-auto"
        value={pageSize}
        onChange={(e) => onPageSizeChange(Number(e.target.value))}
      >
        {pageSizeOptions.map((size) => (
          <option key={size} value={size}>
            {size === ALL_ROWS ? text.all : size}
          </option>
        ))}
      </select>
    </div>
  )

  if (pageCount <= 1) {
    return sizeChooser ? <div className="vmci-table__pagination">{sizeChooser}</div> : null
  }

  const pageButton = (target: number, label: string, content: ReactNode, disabled = false) => (
    <li className={clsx('page-item', disabled && 'disabled')}>
      <button
        type="button"
        className="page-link"
        onClick={() => onPageChange(target)}
        disabled={disabled}
        aria-label={label}
        title={label}
      >
        {content}
      </button>
    </li>
  )

  return (
    <div className="vmci-table__pagination">
      <nav aria-label={text.pagination}>
        {compact ? (
          <div className="d-flex align-items-center gap-2">
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => onPageChange(pageIndex - 1)}
              disabled={isFirst}
            >
              <FontAwesomeIcon icon={faChevronLeft} aria-hidden="true" /> {text.previous}
            </button>
            <span className="small vmci-muted" aria-live="polite">
              {text.pageOf(pageIndex + 1, pageCount)}
            </span>
            <button
              type="button"
              className="btn btn-sm btn-outline-secondary"
              onClick={() => onPageChange(pageIndex + 1)}
              disabled={isLast}
            >
              {text.next} <FontAwesomeIcon icon={faChevronRight} aria-hidden="true" />
            </button>
          </div>
        ) : (
          <ul className="pagination pagination-sm mb-0">
            {pageButton(0, text.first, <FontAwesomeIcon icon={faAnglesLeft} />, isFirst)}
            {pageButton(
              pageIndex - 1,
              text.previous,
              <FontAwesomeIcon icon={faChevronLeft} />,
              isFirst,
            )}
            {pageWindow(pageIndex, pageCount).map((page, i) =>
              page === null ? (
                <li key={`gap${i}`} className="page-item disabled" aria-hidden="true">
                  <span className="page-link">…</span>
                </li>
              ) : (
                <li key={page} className={clsx('page-item', page === pageIndex && 'active')}>
                  <button
                    type="button"
                    className="page-link"
                    onClick={() => onPageChange(page)}
                    aria-label={text.page(page + 1)}
                    aria-current={page === pageIndex ? 'page' : undefined}
                  >
                    {page + 1}
                  </button>
                </li>
              ),
            )}
            {pageButton(
              pageIndex + 1,
              text.next,
              <FontAwesomeIcon icon={faChevronRight} />,
              isLast,
            )}
            {pageButton(pageCount - 1, text.last, <FontAwesomeIcon icon={faAnglesRight} />, isLast)}
          </ul>
        )}
      </nav>
      {sizeChooser}
    </div>
  )
}

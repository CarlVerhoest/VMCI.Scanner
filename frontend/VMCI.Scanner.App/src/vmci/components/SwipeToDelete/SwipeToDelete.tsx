import {
  forwardRef,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type PointerEvent,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { faTrash } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { IconButton } from '../IconButton/IconButton'
import { useLabels } from '../VMCIProvider/vmciContext'
import { swipeToDeleteLabels, type SwipeToDeleteLabels } from './SwipeToDelete.labels'
import './SwipeToDelete.css'

export interface SwipeToDeleteProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Called when swiped past the threshold and released, or when the button is pressed. */
  onDelete: () => void
  /** Swipe direction that deletes. Default `left`. */
  direction?: 'left' | 'right'
  /** Part of the width to swipe before release deletes (0-1). Default 0.4. */
  threshold?: number
  /** Also show a delete button (for mouse and keyboard). Default true. */
  showButton?: boolean
  disabled?: boolean
  children: ReactNode
  /** Overrides the default texts. */
  labels?: Partial<SwipeToDeleteLabels>
}

// A horizontal move this large (px) starts a swipe; smaller moves stay clicks or scrolls.
const START_DISTANCE = 8

/**
 * Wraps a card or row: swipe it sideways and release past the threshold to delete. The app
 * decides what "delete" means - usually it opens a ConfirmDialog. Vertical scrolling keeps
 * working, and a visible delete button offers the same for mouse and keyboard.
 */
export const SwipeToDelete = forwardRef<HTMLDivElement, SwipeToDeleteProps>(function SwipeToDelete(
  {
    onDelete,
    direction = 'left',
    threshold = 0.4,
    showButton = true,
    disabled = false,
    children,
    labels,
    className,
    ...rest
  },
  ref,
) {
  const text = useLabels('swipeToDelete', swipeToDeleteLabels, labels)
  const [offset, setOffset] = useState(0)
  const [dragging, setDragging] = useState(false)
  const [width, setWidth] = useState(0)
  const start = useRef<{ x: number; y: number; id: number } | null>(null)
  const swiped = useRef(false)
  const sign = direction === 'left' ? -1 : 1

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    if (disabled || (e.pointerType === 'mouse' && e.button !== 0)) return
    start.current = { x: e.clientX, y: e.clientY, id: e.pointerId }
    swiped.current = false
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const s = start.current
    if (!s || s.id !== e.pointerId) return
    const dx = e.clientX - s.x
    const dy = e.clientY - s.y
    if (!dragging) {
      // A mostly vertical move is a scroll: let it go.
      if (Math.abs(dy) > Math.abs(dx) && Math.abs(dy) > START_DISTANCE) {
        start.current = null
        return
      }
      if (Math.abs(dx) < START_DISTANCE || Math.sign(dx) !== sign) return
      setDragging(true)
      swiped.current = true
      e.currentTarget.setPointerCapture?.(e.pointerId)
    }
    // Only the deleting direction moves; the other way is held at 0.
    setOffset(sign * Math.max(0, sign * dx))
  }

  function onPointerEnd(e: PointerEvent<HTMLDivElement>) {
    const s = start.current
    start.current = null
    if (!s || !dragging) return
    setDragging(false)
    const passed =
      Math.abs(offset) >= (e.currentTarget.getBoundingClientRect().width || 1) * threshold
    setOffset(0)
    if (passed) onDelete()
  }

  const progress = width ? Math.min(1, Math.abs(offset) / (width * threshold)) : 0

  return (
    <div
      ref={ref}
      {...rest}
      className={clsx(
        'vmci-swipe',
        `vmci-swipe--${direction}`,
        dragging && 'vmci-swipe--dragging',
        className,
      )}
    >
      <div
        className="vmci-swipe__behind"
        aria-hidden="true"
        style={{ opacity: offset ? 0.4 + 0.6 * progress : 0 }}
      >
        <FontAwesomeIcon icon={faTrash} />
        <span>{text.delete}</span>
      </div>
      <div
        className="vmci-swipe__content"
        style={{ transform: offset ? `translateX(${offset}px)` : undefined }}
        onPointerDown={(e) => {
          setWidth(e.currentTarget.getBoundingClientRect().width)
          onPointerDown(e)
        }}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        // A swipe must not also count as a click on the content.
        onClickCapture={(e) => {
          if (swiped.current) {
            e.stopPropagation()
            e.preventDefault()
            swiped.current = false
          }
        }}
      >
        <div className="vmci-swipe__body">{children}</div>
        {showButton && (
          <IconButton
            icon={faTrash}
            label={text.delete}
            className="vmci-swipe__button text-danger"
            disabled={disabled}
            onClick={onDelete}
          />
        )}
      </div>
    </div>
  )
})

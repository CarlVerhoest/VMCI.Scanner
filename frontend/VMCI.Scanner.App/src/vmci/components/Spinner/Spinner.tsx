import {
  forwardRef,
  useLayoutEffect,
  useRef,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { useLabels } from '../VMCIProvider/vmciContext'
import { spinnerLabels, type SpinnerLabels } from './Spinner.labels'
import './Spinner.css'

export interface SpinnerProps extends ComponentPropsWithoutRef<'div'> {
  /** Shows the overlay and blocks interaction with the children. */
  active: boolean
  /** Content that is dimmed (not replaced) while active. */
  children?: ReactNode
  /** Animation: `blocks` (the familiar VMCI look) or Bootstrap's `border` spinner. */
  variant?: 'blocks' | 'border'
  /** Overrides the default texts. */
  labels?: Partial<SpinnerLabels>
}

// Eight blocks around an empty centre, lit one after another clockwise (the look of
// react-loader-spinner's Blocks, but in CSS so it follows --vmci-accent).
const BLOCK_ORDER = [0, 1, 2, 7, -1, 3, 6, 5, 4]

/**
 * Busy overlay over its children, e.g. one global instance driven by `useHttpActivity()`.
 * The spinner is fixed to the middle of the viewport, so it stays visible on long pages.
 */
export const Spinner = forwardRef<HTMLDivElement, SpinnerProps>(function Spinner(
  { active, children, variant = 'blocks', labels, className, ...rest },
  ref,
) {
  const text = useLabels('spinner', spinnerLabels, labels)
  const contentRef = useRef<HTMLDivElement>(null)

  // The backdrop stops the mouse; `inert` also stops keyboard focus and screen readers.
  // Set on the DOM node because React 18 has no `inert` prop.
  useLayoutEffect(() => {
    contentRef.current?.toggleAttribute('inert', active)
  }, [active])

  return (
    <div ref={ref} {...rest} className={clsx('vmci-spinner', className)} aria-busy={active}>
      <div ref={contentRef} className="vmci-spinner__content">
        {children}
      </div>
      {active && (
        <div className="vmci-spinner__backdrop">
          <div className="vmci-spinner__indicator" role="status">
            {variant === 'blocks' ? (
              <div className="vmci-spinner__blocks" aria-hidden="true">
                {BLOCK_ORDER.map((step, i) =>
                  step < 0 ? (
                    <span key={i} />
                  ) : (
                    <span
                      key={i}
                      className="vmci-spinner__block"
                      style={{ animationDelay: `${step * 0.125}s` }}
                    />
                  ),
                )}
              </div>
            ) : (
              <div className="spinner-border vmci-spinner__border" aria-hidden="true" />
            )}
            <span className="visually-hidden">{text.busy}</span>
          </div>
        </div>
      )}
    </div>
  )
})

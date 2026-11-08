import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import clsx from 'clsx'
import { useLabels } from '../VMCIProvider/vmciContext'
import { loadingStateLabels, type LoadingStateLabels } from './LoadingState.labels'
import './LoadingState.css'

export interface LoadingStateProps extends ComponentPropsWithoutRef<'div'> {
  /** `sm` for inside a card or table, `lg` for a whole page (Suspense fallback). */
  size?: 'sm' | 'lg'
  /** Hide the text visually; it stays available to screen readers. */
  hideLabel?: boolean
  /** Overrides the default texts. */
  labels?: Partial<LoadingStateLabels>
}

/** Inline loading indicator that takes the place of content (unlike the Spinner overlay). */
export const LoadingState = forwardRef<HTMLDivElement, LoadingStateProps>(function LoadingState(
  { size, hideLabel = false, labels, className, ...rest },
  ref,
) {
  const text = useLabels('loadingState', loadingStateLabels, labels)
  return (
    <div
      ref={ref}
      role="status"
      {...rest}
      className={clsx('vmci-loading-state', size && `vmci-loading-state--${size}`, className)}
    >
      <span
        className={clsx('spinner-border', size === 'sm' && 'spinner-border-sm')}
        aria-hidden="true"
      />
      <span className={clsx('vmci-loading-state__label', hideLabel && 'visually-hidden')}>
        {text.loading}
      </span>
    </div>
  )
})

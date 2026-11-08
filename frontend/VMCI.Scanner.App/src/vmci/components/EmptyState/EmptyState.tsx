import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import clsx from 'clsx'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useLabels } from '../VMCIProvider/vmciContext'
import { emptyStateLabels, type EmptyStateLabels } from './EmptyState.labels'
import './EmptyState.css'

export interface EmptyStateProps extends Omit<ComponentPropsWithoutRef<'div'>, 'title'> {
  /** Large icon above the title. */
  icon?: IconDefinition
  /** Short statement, e.g. "Nog geen vluchten". Defaults to `labels.title`. */
  title?: ReactNode
  /** Explanation or hint below the title. */
  children?: ReactNode
  /** Call to action, e.g. a button to add the first item. */
  action?: ReactNode
  /** `sm`: compact, for inside a table or card. */
  size?: 'sm'
  /** Heading level of the title, to fit the page outline. */
  headingLevel?: 2 | 3 | 4 | 5 | 6
  /** Overrides the default texts. */
  labels?: Partial<EmptyStateLabels>
}

/** Shown instead of a list or table that has no items yet. */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { icon, title, children, action, size, headingLevel = 3, labels, className, ...rest },
  ref,
) {
  const text = useLabels('emptyState', emptyStateLabels, labels)
  const Heading = `h${headingLevel}` as const
  return (
    <div
      ref={ref}
      {...rest}
      className={clsx('vmci-empty-state', size && `vmci-empty-state--${size}`, className)}
    >
      {icon && (
        <FontAwesomeIcon icon={icon} className="vmci-empty-state__icon" aria-hidden="true" />
      )}
      <Heading className="vmci-empty-state__title">{title ?? text.title}</Heading>
      {children && <div className="vmci-empty-state__text">{children}</div>}
      {action && <div className="vmci-empty-state__action">{action}</div>}
    </div>
  )
})

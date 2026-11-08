import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import clsx from 'clsx'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './StatusChip.css'

export type StatusTone = 'success' | 'warning' | 'danger' | 'info' | 'primary' | 'neutral'

export interface StatusChipProps extends ComponentPropsWithoutRef<'span'> {
  /** Meaning of the status; picks Bootstrap's subtle background and emphasis colour. */
  tone?: StatusTone
  /** Optional icon before the text, so colour is not the only signal. */
  icon?: IconDefinition
  /** Solid fill instead of the subtle background, for strong signals. */
  solid?: boolean
  children: ReactNode
}

/** Small status pill, e.g. "Afgerond", "Verloopt binnenkort", "Ontbreekt". */
export const StatusChip = forwardRef<HTMLSpanElement, StatusChipProps>(function StatusChip(
  { tone = 'neutral', icon, solid = false, children, className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      {...rest}
      className={clsx(
        'vmci-status-chip',
        `vmci-status-chip--${tone}`,
        solid && 'vmci-status-chip--solid',
        className,
      )}
    >
      {icon && <FontAwesomeIcon icon={icon} aria-hidden="true" />}
      {children}
    </span>
  )
})

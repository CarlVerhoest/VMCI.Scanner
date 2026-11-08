import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import clsx from 'clsx'
import './FormField.css'

export interface RequiredMarkProps extends Omit<ComponentPropsWithoutRef<'span'>, 'children'> {
  /** Turns the asterisk red once the field failed validation. */
  isInvalid?: boolean
}

/**
 * The `*` after a required field's label. Decorative (`aria-hidden`): the control itself
 * carries `aria-required`, which FormField sets for you.
 */
export const RequiredMark = forwardRef<HTMLSpanElement, RequiredMarkProps>(function RequiredMark(
  { isInvalid = false, className, ...rest },
  ref,
) {
  return (
    <span
      ref={ref}
      aria-hidden="true"
      {...rest}
      className={clsx('vmci-required-mark', isInvalid && 'vmci-required-mark--invalid', className)}
    >
      *
    </span>
  )
})

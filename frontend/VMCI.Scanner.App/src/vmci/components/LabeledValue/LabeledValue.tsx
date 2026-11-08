import { forwardRef, useId, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import clsx from 'clsx'
import { useLabels } from '../VMCIProvider/vmciContext'
import { labeledValueLabels, type LabeledValueLabels } from './LabeledValue.labels'
import './LabeledValue.css'

export interface LabeledValueProps extends ComponentPropsWithoutRef<'div'> {
  /** What the value is, e.g. "Voornaam". */
  label: ReactNode
  /** The value. `null`, `undefined` and `''` show the empty text. */
  children?: ReactNode
  /** `stacked`: label above value. `inline`: label left, value right (from `sm` up). */
  layout?: 'stacked' | 'inline'
  /** Overrides the default texts. */
  labels?: Partial<LabeledValueLabels>
}

const isEmpty = (value: ReactNode) => value === null || value === undefined || value === ''

/** Read-only label and value, e.g. on a profile or detail page. */
export const LabeledValue = forwardRef<HTMLDivElement, LabeledValueProps>(function LabeledValue(
  { label, children, layout = 'stacked', labels, className, ...rest },
  ref,
) {
  const text = useLabels('labeledValue', labeledValueLabels, labels)
  const labelId = useId()
  const empty = isEmpty(children)
  return (
    <div
      ref={ref}
      role="group"
      aria-labelledby={labelId}
      {...rest}
      className={clsx('vmci-labeled-value', `vmci-labeled-value--${layout}`, className)}
    >
      <div id={labelId} className="vmci-labeled-value__label">
        {label}
      </div>
      <div
        className={clsx('vmci-labeled-value__value', empty && 'vmci-labeled-value__value--empty')}
      >
        {empty ? text.empty : children}
      </div>
    </div>
  )
})

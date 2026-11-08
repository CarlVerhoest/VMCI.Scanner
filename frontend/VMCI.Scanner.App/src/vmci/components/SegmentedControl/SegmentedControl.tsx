import {
  forwardRef,
  useId,
  type ComponentPropsWithoutRef,
  type ForwardedRef,
  type ReactElement,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useFormField } from '../FormField/formFieldContext'
import './SegmentedControl.css'

export type SegmentValue = string | number | boolean

export interface SegmentOption<T extends SegmentValue> {
  value: T
  label: ReactNode
  icon?: IconDefinition
  /** Show only the icon; `label` must then be a string (used as accessible name). */
  iconOnly?: boolean
  disabled?: boolean
}

export interface SegmentedControlProps<T extends SegmentValue> extends Omit<
  ComponentPropsWithoutRef<'div'>,
  'onChange' | 'defaultValue'
> {
  options: readonly SegmentOption<T>[]
  /** Selected value; `null` selects nothing. */
  value: T | null
  onValueChanged: (value: T) => void
  size?: 'sm' | 'lg'
  /** `light` is for use on a coloured header. */
  variant?: 'primary' | 'secondary' | 'light'
  /** Stretch to the full width (segments share it equally). Handy on phones. */
  fullWidth?: boolean
  disabled?: boolean
  /** Radio group name; generated when omitted. */
  name?: string
}

/**
 * A small set of mutually exclusive choices shown as joined buttons (e.g. UTC / LT,
 * Basis / Uitdaging). Real radio inputs underneath, so arrow keys and forms just work.
 * Name it with `aria-label`, `aria-labelledby` or a surrounding `<FormField group>`.
 */
function SegmentedControlInner<T extends SegmentValue>(
  {
    options,
    value,
    onValueChanged,
    size,
    variant = 'primary',
    fullWidth = false,
    disabled,
    name,
    className,
    ...rest
  }: SegmentedControlProps<T>,
  ref: ForwardedRef<HTMLDivElement>,
) {
  const generatedName = useId()
  const field = useFormField()
  const groupName = name ?? generatedName
  const isDisabled = disabled ?? field?.disabled ?? false

  return (
    <div
      ref={ref}
      role="radiogroup"
      aria-describedby={field?.['aria-describedby']}
      aria-invalid={field?.['aria-invalid']}
      aria-required={field?.['aria-required']}
      {...rest}
      className={clsx(
        'btn-group vmci-segmented-control',
        size && `btn-group-${size}`,
        fullWidth && 'vmci-segmented-control--full',
        className,
      )}
    >
      {options.map((option, index) => {
        const id = `${groupName}-${index}`
        const checked = option.value === value
        return (
          <span key={String(option.value)} className="vmci-segmented-control__segment">
            <input
              type="radio"
              className="btn-check"
              id={id}
              name={groupName}
              value={String(option.value)}
              checked={checked}
              disabled={isDisabled || option.disabled}
              onChange={() => onValueChanged(option.value)}
            />
            <label
              htmlFor={id}
              className={clsx('btn', `btn-outline-${variant}`)}
              aria-label={
                option.iconOnly && typeof option.label === 'string' ? option.label : undefined
              }
              title={option.iconOnly && typeof option.label === 'string' ? option.label : undefined}
            >
              {option.icon && <FontAwesomeIcon icon={option.icon} fixedWidth aria-hidden="true" />}
              {!option.iconOnly && <span>{option.label}</span>}
            </label>
          </span>
        )
      })}
    </div>
  )
}

export const SegmentedControl = forwardRef(SegmentedControlInner) as <T extends SegmentValue>(
  props: SegmentedControlProps<T> & { ref?: ForwardedRef<HTMLDivElement> },
) => ReactElement | null

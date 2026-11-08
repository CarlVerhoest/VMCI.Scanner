import {
  cloneElement,
  forwardRef,
  isValidElement,
  useId,
  useMemo,
  type ComponentPropsWithoutRef,
  type ReactElement,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import { InfoTip } from '../InfoTip/InfoTip'
import { FormFieldContext, type FormFieldControlProps } from './formFieldContext'
import { RequiredMark } from './RequiredMark'
import './FormField.css'

interface InjectableProps {
  id?: string
  className?: string
  disabled?: boolean
  'aria-describedby'?: string
  'aria-invalid'?: boolean | 'true' | 'false'
  'aria-required'?: boolean | 'true' | 'false'
}

export interface FormFieldProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** Visible label (or legend when `group`). */
  label: ReactNode
  /**
   * The control. An element (`<input>`, `Form.Control`, a VMCI input) gets `id`, the aria
   * attributes and `is-invalid` injected; a function receives them to place yourself.
   */
  children: ReactElement | ((field: FormFieldControlProps) => ReactNode)
  /** Shows the required mark and sets `aria-required` on the control. */
  required?: boolean
  /** Help text below the control. */
  hint?: ReactNode
  /** Error message; when set the field is invalid. */
  error?: ReactNode
  /** Force the invalid state without a message (e.g. while the message is elsewhere). */
  isInvalid?: boolean
  /** Disables the control (all controls for a `group`). */
  disabled?: boolean
  /** Extra explanation as an InfoTip next to the label. */
  info?: ReactNode
  /** Id of the control; generated when omitted. */
  controlId?: string
  /** Hide the label visually; it stays the control's accessible name. */
  hideLabel?: boolean
  /** `horizontal`: label left, control right (from `md` up). */
  layout?: 'stacked' | 'horizontal'
  /** For a group of controls (radios, SegmentedControl): renders a fieldset with a legend. */
  group?: boolean
}

/** Label, control, hint and error, correctly linked for screen readers. */
export const FormField = forwardRef<HTMLDivElement, FormFieldProps>(function FormField(
  {
    label,
    children,
    required = false,
    hint,
    error,
    isInvalid,
    disabled = false,
    info,
    controlId,
    hideLabel = false,
    layout = 'stacked',
    group = false,
    className,
    ...rest
  },
  ref,
) {
  const generatedId = useId()
  // An id already on the child wins, so the label always points at the real control.
  const childId =
    typeof children !== 'function' && isValidElement<InjectableProps>(children)
      ? children.props.id
      : undefined
  const id = controlId ?? childId ?? `${generatedId}-control`
  const hintId = hint ? `${id}-hint` : undefined
  const errorId = error ? `${id}-error` : undefined
  const invalid = isInvalid ?? !!error
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined

  const field = useMemo<FormFieldControlProps>(
    () => ({
      id,
      'aria-describedby': describedBy,
      'aria-invalid': invalid || undefined,
      'aria-required': required || undefined,
      isInvalid: invalid,
      required,
      disabled,
      inputProps: {
        id,
        'aria-describedby': describedBy,
        'aria-invalid': invalid || undefined,
        'aria-required': required || undefined,
        disabled: disabled || undefined,
      },
    }),
    [id, describedBy, invalid, required, disabled],
  )

  const control = typeof children === 'function' ? children(field) : injectInto(children, field)
  const labelClass = clsx('form-label vmci-form-field__label', hideLabel && 'visually-hidden')
  const rootClass = clsx('vmci-form-field', `vmci-form-field--${layout}`, className)
  const labelContent = (
    <>
      {label}
      {required && <RequiredMark isInvalid={invalid} />}
    </>
  )
  const infoTip = info ? <InfoTip content={info} /> : null

  const body = (
    <div className="vmci-form-field__control">
      {control}
      {hint && (
        <div id={hintId} className="form-text">
          {hint}
        </div>
      )}
      {error && (
        <div id={errorId} className="invalid-feedback d-block" aria-live="polite">
          {error}
        </div>
      )}
    </div>
  )

  if (group) {
    // The legend must be the fieldset's first child to name the group.
    return (
      <FormFieldContext.Provider value={field}>
        <fieldset
          ref={ref as never}
          {...(rest as ComponentPropsWithoutRef<'fieldset'>)}
          aria-describedby={describedBy}
          disabled={disabled}
          className={rootClass}
        >
          <legend className={clsx(labelClass, 'vmci-form-field__label-row')}>
            {labelContent}
            {infoTip}
          </legend>
          {body}
        </fieldset>
      </FormFieldContext.Provider>
    )
  }

  return (
    <FormFieldContext.Provider value={field}>
      <div ref={ref} {...rest} className={rootClass}>
        <div className="vmci-form-field__label-row">
          <label htmlFor={id} className={labelClass}>
            {labelContent}
          </label>
          {infoTip}
        </div>
        {body}
      </div>
    </FormFieldContext.Provider>
  )
})

/** Adds the wiring to a plain element without overriding what the caller set explicitly. */
function injectInto(child: ReactElement, field: FormFieldControlProps): ReactNode {
  if (!isValidElement<InjectableProps>(child)) return child
  const own = child.props
  const describedBy =
    [own['aria-describedby'], field['aria-describedby']].filter(Boolean).join(' ') || undefined
  const injected: InjectableProps = {
    id: own.id ?? field.id,
    'aria-describedby': describedBy,
    'aria-invalid': own['aria-invalid'] ?? field['aria-invalid'],
    'aria-required': own['aria-required'] ?? field['aria-required'],
    disabled: own.disabled ?? (field.disabled || undefined),
    className: clsx(own.className, field.isInvalid && 'is-invalid') || undefined,
  }
  return cloneElement(child, injected)
}

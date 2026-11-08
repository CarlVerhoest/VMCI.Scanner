import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import clsx from 'clsx'
import { useLabels } from '../VMCIProvider/vmciContext'
import { formActionsLabels, type FormActionsLabels } from './FormActions.labels'
import './FormActions.css'

export interface FormActionsProps extends Omit<ComponentPropsWithoutRef<'div'>, 'children'> {
  /** A save is in flight: both buttons are disabled and Save shows a spinner. */
  isBusy?: boolean
  /** The form may not be submitted yet: disables Save only, never Cancel. */
  disabled?: boolean
  /** Cancel handler; without it there is no Cancel button. */
  onCancel?: () => void
  /** Extra actions on the other side, e.g. a Delete button. */
  extra?: ReactNode
  /** Variant of the Save button. */
  saveVariant?: 'primary' | 'danger' | 'success'
  /** Overrides the default texts. */
  labels?: Partial<FormActionsLabels>
}

/**
 * Save and Cancel at the end of a form. Save is a submit button, so render this inside the
 * `<form onSubmit>`. On phones the buttons stack full-width, Save on top.
 */
export const FormActions = forwardRef<HTMLDivElement, FormActionsProps>(function FormActions(
  {
    isBusy = false,
    disabled = false,
    onCancel,
    extra,
    saveVariant = 'primary',
    labels,
    className,
    ...rest
  },
  ref,
) {
  const text = useLabels('formActions', formActionsLabels, labels)
  return (
    <div ref={ref} {...rest} className={clsx('vmci-form-actions', className)}>
      {extra && <div className="vmci-form-actions__extra">{extra}</div>}
      <div className="vmci-form-actions__main">
        <button
          type="submit"
          className={`btn btn-${saveVariant}`}
          disabled={isBusy || disabled}
          aria-busy={isBusy || undefined}
        >
          {isBusy && <span className="spinner-border spinner-border-sm me-2" aria-hidden="true" />}
          {isBusy ? text.saving : text.save}
        </button>
        {onCancel && (
          <button
            type="button"
            className="btn btn-outline-secondary"
            onClick={onCancel}
            disabled={isBusy}
          >
            {text.cancel}
          </button>
        )}
      </div>
    </div>
  )
})

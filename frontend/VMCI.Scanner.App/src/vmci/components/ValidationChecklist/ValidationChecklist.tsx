import { forwardRef, type ComponentPropsWithoutRef, type ReactNode } from 'react'
import clsx from 'clsx'
import { faCheck, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useLabels } from '../VMCIProvider/vmciContext'
import {
  validationChecklistLabels,
  type ValidationChecklistLabels,
} from './ValidationChecklist.labels'
import './ValidationChecklist.css'

export interface ValidationRule {
  /** Stable key; defaults to the index. */
  key?: string
  /** The requirement, e.g. "Minstens 8 tekens". */
  label: ReactNode
  isValid: boolean
}

export interface ValidationChecklistProps extends Omit<ComponentPropsWithoutRef<'ul'>, 'children'> {
  rules: ValidationRule[]
  /** Overrides the default texts. */
  labels?: Partial<ValidationChecklistLabels>
}

/**
 * Live list of requirements with a check or cross, e.g. password rules. Give the input
 * `aria-describedby` pointing to this list's `id`.
 */
export const ValidationChecklist = forwardRef<HTMLUListElement, ValidationChecklistProps>(
  function ValidationChecklist({ rules, labels, className, ...rest }, ref) {
    const text = useLabels('validationChecklist', validationChecklistLabels, labels)
    return (
      <ul
        ref={ref}
        aria-live="polite"
        {...rest}
        className={clsx('vmci-validation-checklist', className)}
      >
        {rules.map((rule, index) => (
          <li
            key={rule.key ?? index}
            className={clsx(
              'vmci-validation-checklist__item',
              rule.isValid
                ? 'vmci-validation-checklist__item--met'
                : 'vmci-validation-checklist__item--not-met',
            )}
          >
            <FontAwesomeIcon
              icon={rule.isValid ? faCheck : faXmark}
              fixedWidth
              aria-hidden="true"
            />
            <span>
              {rule.label}
              <span className="visually-hidden">
                {': '}
                {rule.isValid ? text.met : text.notMet}
              </span>
            </span>
          </li>
        ))}
      </ul>
    )
  },
)

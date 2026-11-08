import { forwardRef, useMemo, useRef, type ComponentPropsWithoutRef } from 'react'
import clsx from 'clsx'
import { faMagnifyingGlass, faXmark } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { mergeRefs } from '../../utils/mergeRefs'
import { useFormField } from '../FormField/formFieldContext'
import { useLabels } from '../VMCIProvider/vmciContext'
import { searchInputLabels, type SearchInputLabels } from './SearchInput.labels'
import './SearchInput.css'

export interface SearchInputProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'value' | 'defaultValue' | 'onChange' | 'type' | 'size'
> {
  /** Current search text (`''` when empty). */
  value: string
  /** Called with the new text; `''` after clearing. */
  onValueChanged: (value: string) => void
  size?: 'sm' | 'lg'
  /** Show the magnifying glass in front. */
  showIcon?: boolean
  /** Class for the wrapping input group (`className` goes to the input). */
  wrapperClassName?: string
  /** Overrides the default texts. */
  labels?: Partial<SearchInputLabels>
}

/** Search box with a clear button; Escape also clears. */
export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(function SearchInput(
  {
    value,
    onValueChanged,
    size,
    showIcon = true,
    wrapperClassName,
    labels,
    className,
    placeholder,
    disabled,
    onKeyDown,
    ...rest
  },
  ref,
) {
  const text = useLabels('searchInput', searchInputLabels, labels)
  const field = useFormField()
  const inputRef = useRef<HTMLInputElement | null>(null)
  const setRefs = useMemo(() => mergeRefs(inputRef, ref), [ref])
  const isDisabled = disabled ?? field?.disabled
  const hasName =
    rest['aria-label'] !== undefined || rest['aria-labelledby'] !== undefined || !!field

  const clear = () => {
    onValueChanged('')
    inputRef.current?.focus()
  }

  return (
    <div
      className={clsx(
        'input-group vmci-search-input',
        size && `input-group-${size}`,
        wrapperClassName,
      )}
    >
      {showIcon && (
        <span className="input-group-text vmci-search-input__icon" aria-hidden="true">
          <FontAwesomeIcon icon={faMagnifyingGlass} fixedWidth />
        </span>
      )}
      <input
        ref={setRefs}
        type="search"
        id={field?.id}
        aria-describedby={field?.['aria-describedby']}
        aria-label={hasName ? undefined : text.label}
        {...rest}
        className={clsx('form-control', className)}
        value={value}
        placeholder={placeholder ?? text.placeholder}
        disabled={isDisabled}
        onChange={(e) => onValueChanged(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Escape' && value !== '') {
            e.preventDefault()
            onValueChanged('')
          }
          onKeyDown?.(e)
        }}
      />
      <button
        type="button"
        className="btn btn-outline-secondary vmci-search-input__clear"
        aria-label={text.clear}
        title={text.clear}
        onClick={clear}
        disabled={isDisabled || value === ''}
      >
        <FontAwesomeIcon icon={faXmark} fixedWidth aria-hidden="true" />
      </button>
    </div>
  )
})

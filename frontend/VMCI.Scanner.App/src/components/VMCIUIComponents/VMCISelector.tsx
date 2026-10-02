import Select, { MultiValue, SingleValue } from 'react-select'

interface InternalOption<T> {
  value: T
  label: string
}

export interface VMCISelectorProps<T> {
  options: T[]
  selectedValue: T | T[] | null

  // Either the property name to read the label from, or a function computing it.
  valueLabel: keyof T | ((value: T) => string)

  isInvalid?: boolean
  multiSelect?: boolean
  disabled?: boolean
  tabIndex?: number
  autoFocus?: boolean
  openMenuOnFocus?: boolean
  placeholder?: string

  onValueChanged: (newValue: T | T[] | null) => void
}

export function VMCISelector<T>({
  options,
  selectedValue,
  valueLabel,
  isInvalid = false,
  multiSelect = false,
  disabled = false,
  tabIndex,
  autoFocus,
  openMenuOnFocus = true,
  placeholder = 'select...',
  onValueChanged,
}: VMCISelectorProps<T>) {
  const internalOptions = options.map((option) => toInternalOption(option, valueLabel))
  const internalSelectedValue = toInternalSelectedValue(selectedValue, multiSelect, valueLabel)

  return (
    <Select<InternalOption<T>, boolean>
      isMulti={multiSelect}
      options={internalOptions}
      value={internalSelectedValue}
      onChange={(newValue) => handleChange(newValue, multiSelect, onValueChanged)}
      placeholder={placeholder}
      isClearable
      isDisabled={disabled}
      autoFocus={autoFocus}
      openMenuOnFocus={openMenuOnFocus}
      menuPosition="fixed"
      tabIndex={tabIndex}
      className="scanner-uicontrol-select"
      classNamePrefix="scanner-select"
      styles={{
        control: (base, state) => ({
          ...base,
          backgroundColor: 'var(--scanner-surface)',
          borderColor: isInvalid ? 'var(--bs-danger)' : 'var(--scanner-surface-border)',
          boxShadow: state.isFocused ? `0 0 0 0.25rem var(--scanner-accent-soft)` : 'none',
          ':hover': { borderColor: isInvalid ? 'var(--bs-danger)' : 'var(--scanner-accent)' },
        }),
        singleValue: (base) => ({ ...base, color: 'var(--scanner-text)' }),
        input: (base) => ({ ...base, color: 'var(--scanner-text)' }),
        placeholder: (base) => ({ ...base, color: 'var(--scanner-text-muted)' }),
        menu: (base) => ({ ...base, backgroundColor: 'var(--scanner-surface)', zIndex: 1050 }),
        option: (base, state) => ({
          ...base,
          backgroundColor: state.isSelected
            ? 'var(--scanner-accent)'
            : state.isFocused
              ? 'var(--scanner-accent-soft)'
              : 'transparent',
          color: state.isSelected ? '#fff' : 'var(--scanner-text)',
        }),
        multiValue: (base) => ({ ...base, backgroundColor: 'var(--scanner-accent-soft)' }),
        multiValueLabel: (base) => ({ ...base, color: 'var(--scanner-text)' }),
        indicatorSeparator: (base) => ({ ...base, backgroundColor: 'var(--scanner-surface-border)' }),
      }}
    />
  )
}

function toInternalOption<T>(value: T, valueLabel: keyof T | ((value: T) => string)): InternalOption<T> {
  const label = typeof valueLabel === 'function' ? valueLabel(value) : String(value[valueLabel])
  return { value, label }
}

function toInternalSelectedValue<T>(
  selectedValue: T | T[] | null,
  multiSelect: boolean,
  valueLabel: keyof T | ((value: T) => string)
): InternalOption<T> | InternalOption<T>[] | null {
  if (selectedValue === null) return multiSelect ? [] : null

  if (multiSelect) {
    const values = Array.isArray(selectedValue) ? selectedValue : [selectedValue]
    return values.map((v) => toInternalOption(v, valueLabel))
  }

  if (Array.isArray(selectedValue)) {
    throw new Error('selectedValue must not be an array when multiSelect is false')
  }
  return toInternalOption(selectedValue, valueLabel)
}

function handleChange<T>(
  newValue: SingleValue<InternalOption<T>> | MultiValue<InternalOption<T>>,
  multiSelect: boolean,
  onValueChanged: (newValue: T | T[] | null) => void
) {
  if (!newValue) {
    onValueChanged(multiSelect ? [] : null)
    return
  }

  if (multiSelect) {
    const values = newValue as MultiValue<InternalOption<T>>
    onValueChanged(values.map((o) => o.value))
  } else {
    const single = newValue as SingleValue<InternalOption<T>>
    onValueChanged(single ? single.value : null)
  }
}

import { useMemo, type ReactNode } from 'react'
import Select, {
  components,
  type DropdownIndicatorProps,
  type GroupBase,
  type MultiValue,
  type SingleValue,
  type StylesConfig,
} from 'react-select'
import AsyncSelect from 'react-select/async'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { useFormField } from '../FormField/formFieldContext'
import { useLabels } from '../VMCIProvider/vmciContext'
import { selectorLabels, type SelectorLabels } from './Selector.labels'

export interface SelectorGroup<T> {
  label: string
  options: readonly T[]
}

interface SelectorBaseProps<T> {
  /** The choices. Leave out when using `groups` or `loadOptions`. */
  options?: readonly T[]
  /** Choices under headings (instead of `options`). */
  groups?: readonly SelectorGroup<T>[]
  /**
   * Load choices while the user types (e.g. from the server). Called with '' when the menu
   * opens. Debounced by `loadDelay`.
   */
  loadOptions?: (input: string) => Promise<readonly T[]>
  /** Milliseconds to wait after typing before `loadOptions` runs. Default 300. */
  loadDelay?: number
  /**
   * With `loadOptions`: below this many typed characters (spaces ignored) nothing is loaded and
   * the menu shows `labels.typeMore`. Default 0: also loads with '' when the menu opens.
   */
  minInputLength?: number
  /**
   * With `loadOptions`: also filter the loaded options on the typed text. Default true. Switch it
   * off when the server already searched, e.g. on fields the label does not show.
   */
  enableOptionFilter?: boolean
  /** Heading an option is listed under, for `options` or loaded options. Groups keep the order of their first option. */
  groupBy?: (option: T) => string
  /** Content of an option in the menu. Default: its label. The chosen value still shows the label. */
  renderOption?: (option: T) => ReactNode
  /** Icon in place of the dropdown arrow, e.g. `faMagnifyingGlass` for a search field. */
  icon?: IconDefinition
  /** Minimum width of the menu (any CSS width), when it should be wider than the field. */
  menuMinWidth?: string
  /** Property name or function giving the text of an option. */
  valueLabel: keyof T | ((option: T) => string)
  /**
   * Property name or function giving a unique key, used to recognise the selected option.
   * Default: the label. Give one when labels are not unique.
   */
  optionKey?: keyof T | ((option: T) => string | number)
  isInvalid?: boolean
  disabled?: boolean
  /** Show the clear (×) button. Default true. */
  isClearable?: boolean
  /** Let the user type to filter the options. Default true. */
  isSearchable?: boolean
  openMenuOnFocus?: boolean
  autoFocus?: boolean
  tabIndex?: number
  placeholder?: string
  size?: 'sm'
  /** Id of the inner input; taken from a surrounding FormField when omitted. */
  id?: string
  name?: string
  className?: string
  'aria-label'?: string
  'aria-labelledby'?: string
  /** Overrides the default texts. */
  labels?: Partial<SelectorLabels>
}

export interface SingleSelectorProps<T> extends SelectorBaseProps<T> {
  multiSelect?: false
  value: T | null
  onValueChanged: (value: T | null) => void
}

export interface MultiSelectorProps<T> extends SelectorBaseProps<T> {
  multiSelect: true
  value: readonly T[]
  onValueChanged: (value: T[]) => void
}

export type SelectorProps<T> = SingleSelectorProps<T> | MultiSelectorProps<T>

interface Option<T> {
  value: T
  label: string
  key: string
}

/**
 * Pick one (or with `multiSelect`, several) of your own objects - no `{value, label}`
 * mapping in the caller. Based on react-select: type to filter, keyboard navigation,
 * clearable. The menu floats above dialogs.
 */
export function Selector<T>(props: SelectorProps<T>) {
  const {
    options = [],
    groups,
    loadOptions,
    loadDelay = 300,
    minInputLength = 0,
    enableOptionFilter = true,
    groupBy,
    renderOption,
    icon,
    menuMinWidth,
    valueLabel,
    optionKey,
    isInvalid = false,
    disabled,
    isClearable = true,
    isSearchable = true,
    openMenuOnFocus = true,
    autoFocus,
    tabIndex,
    placeholder,
    size,
    id,
    name,
    className,
    labels,
  } = props
  const text = useLabels('selector', selectorLabels, labels)
  const field = useFormField()

  const toOption = useMemo(() => {
    const labelOf = (o: T) =>
      typeof valueLabel === 'function' ? valueLabel(o) : String(o[valueLabel])
    const keyOf = (o: T) =>
      optionKey === undefined
        ? labelOf(o)
        : String(typeof optionKey === 'function' ? optionKey(o) : o[optionKey])
    return (o: T): Option<T> => ({ value: o, label: labelOf(o), key: keyOf(o) })
  }, [valueLabel, optionKey])

  const selectOptions = useMemo(
    () =>
      groups
        ? groups.map((g) => ({ label: g.label, options: g.options.map(toOption) }))
        : toGroups(options.map(toOption), groupBy),
    [groups, options, toOption, groupBy],
  )

  const selected: Option<T> | Option<T>[] | null = props.multiSelect
    ? props.value.map(toOption)
    : props.value === null
      ? null
      : toOption(props.value)

  const handleChange = (next: SingleValue<Option<T>> | MultiValue<Option<T>>) => {
    if (props.multiSelect) {
      props.onValueChanged(((next as MultiValue<Option<T>>) ?? []).map((o) => o.value))
    } else {
      props.onValueChanged((next as SingleValue<Option<T>>)?.value ?? null)
    }
  }

  const invalid = isInvalid || (field?.isInvalid ?? false)
  const styles = useMemo(
    () => selectorStyles<T>(invalid, size, menuMinWidth),
    [invalid, size, menuMinWidth],
  )
  const tooShort = (input: string) => input.trim().length < minInputLength

  // Debounce the async loader; the latest request wins.
  const debouncedLoad = useMemo(() => {
    if (!loadOptions) return undefined
    let timer: number | undefined
    return (input: string) =>
      new Promise<Option<T>[] | GroupBase<Option<T>>[]>((resolve, reject) => {
        window.clearTimeout(timer)
        if (input.trim().length < minInputLength) {
          resolve([])
          return
        }
        timer = window.setTimeout(() => {
          loadOptions(input).then(
            (found) => resolve(toGroups(found.map(toOption), groupBy)),
            reject,
          )
        }, loadDelay)
      })
  }, [loadOptions, loadDelay, minInputLength, toOption, groupBy])

  const common = {
    inputId: id ?? field?.id,
    name,
    className: className ? `vmci-selector ${className}` : 'vmci-selector',
    classNamePrefix: 'vmci-select',
    isMulti: props.multiSelect ?? false,
    value: selected,
    onChange: handleChange,
    getOptionValue: (o: Option<T>) => o.key,
    getOptionLabel: (o: Option<T>) => o.label,
    placeholder: placeholder ?? text.placeholder,
    noOptionsMessage: ({ inputValue }: { inputValue: string }) =>
      debouncedLoad && tooShort(inputValue) ? text.typeMore(minInputLength) : text.noOptions,
    formatOptionLabel: renderOption
      ? (o: Option<T>, meta: { context: 'menu' | 'value' }) =>
          meta.context === 'menu' ? renderOption(o.value) : o.label
      : undefined,
    components: icon
      ? {
          DropdownIndicator: (
            p: DropdownIndicatorProps<Option<T>, boolean, GroupBase<Option<T>>>,
          ) => (
            <components.DropdownIndicator {...p}>
              <FontAwesomeIcon icon={icon} />
            </components.DropdownIndicator>
          ),
        }
      : undefined,
    loadingMessage: () => text.loading,
    isClearable,
    isSearchable,
    isDisabled: disabled ?? field?.disabled ?? false,
    autoFocus,
    tabIndex,
    openMenuOnFocus,
    menuPosition: 'fixed' as const,
    styles,
    'aria-label': props['aria-label'],
    'aria-labelledby': props['aria-labelledby'],
    'aria-invalid': invalid || undefined,
    required: field?.required,
  }

  if (debouncedLoad) {
    return (
      <AsyncSelect<Option<T>, boolean, GroupBase<Option<T>>>
        {...common}
        cacheOptions
        defaultOptions={minInputLength === 0}
        filterOption={enableOptionFilter ? undefined : null}
        loadOptions={debouncedLoad}
      />
    )
  }
  return <Select<Option<T>, boolean, GroupBase<Option<T>>> {...common} options={selectOptions} />
}

/** Plain options, or under headings when `groupBy` is given (in the order of each group's first option). */
function toGroups<T>(
  options: Option<T>[],
  groupBy: ((option: T) => string) | undefined,
): Option<T>[] | GroupBase<Option<T>>[] {
  if (!groupBy) return options
  const groups = new Map<string, Option<T>[]>()
  for (const option of options) {
    const label = groupBy(option.value)
    groups.set(label, [...(groups.get(label) ?? []), option])
  }
  return [...groups].map(([label, grouped]) => ({ label, options: grouped }))
}
/** react-select styled with the VMCI tokens, so it matches Bootstrap fields in both themes. */
function selectorStyles<T>(
  invalid: boolean,
  size: 'sm' | undefined,
  menuMinWidth: string | undefined,
): StylesConfig<Option<T>, boolean, GroupBase<Option<T>>> {
  const border = invalid ? 'var(--vmci-danger)' : 'var(--vmci-field-border)'
  return {
    control: (base, state) => ({
      ...base,
      minHeight: size === 'sm' ? 'calc(1.5em + 0.5rem + 2px)' : 'calc(1.5em + 0.75rem + 2px)',
      fontSize: size === 'sm' ? '0.875rem' : base.fontSize,
      backgroundColor: state.isDisabled ? 'var(--bs-secondary-bg)' : 'var(--vmci-surface)',
      borderRadius: 'var(--bs-border-radius)',
      borderColor: state.isFocused && !invalid ? 'var(--vmci-accent)' : border,
      boxShadow: state.isFocused
        ? `0 0 0 0.25rem ${invalid ? 'rgba(var(--vmci-danger-rgb), 0.25)' : 'var(--bs-focus-ring-color)'}`
        : 'none',
      ':hover': { borderColor: invalid ? 'var(--vmci-danger)' : 'var(--vmci-accent)' },
    }),
    valueContainer: (base) => ({ ...base, padding: size === 'sm' ? '0 0.5rem' : base.padding }),
    singleValue: (base) => ({ ...base, color: 'var(--vmci-text)' }),
    input: (base) => ({ ...base, color: 'var(--vmci-text)' }),
    placeholder: (base) => ({ ...base, color: 'var(--vmci-text-muted)' }),
    menu: (base) => ({
      ...base,
      backgroundColor: 'var(--vmci-surface)',
      border: 'var(--bs-border-width) solid var(--vmci-surface-border)',
      borderRadius: 'var(--bs-border-radius)',
      boxShadow: 'var(--vmci-shadow)',
      zIndex: 1060, // above dialogs (1055): the menu is position-fixed
      ...(menuMinWidth ? { minWidth: menuMinWidth } : {}),
    }),
    menuList: (base) => ({ ...base, paddingTop: '0.375rem', paddingBottom: '0.375rem' }),
    groupHeading: (base) => ({ ...base, color: 'var(--vmci-text-muted)', fontWeight: 600 }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? 'var(--vmci-accent)'
        : state.isFocused
          ? 'var(--vmci-accent-soft)'
          : 'transparent',
      color: state.isSelected ? 'var(--vmci-on-accent)' : 'var(--vmci-text)',
      ':active': { backgroundColor: 'var(--vmci-selection-bg)' },
    }),
    multiValue: (base) => ({ ...base, backgroundColor: 'var(--vmci-accent-soft)' }),
    multiValueLabel: (base) => ({ ...base, color: 'var(--vmci-text)' }),
    multiValueRemove: (base) => ({
      ...base,
      color: 'var(--vmci-text-muted)',
      ':hover': { backgroundColor: 'var(--vmci-danger)', color: 'var(--vmci-on-danger)' },
    }),
    indicatorSeparator: (base) => ({ ...base, backgroundColor: 'var(--vmci-surface-border)' }),
    dropdownIndicator: (base) => ({
      ...base,
      color: 'var(--vmci-text-muted)',
      padding: size === 'sm' ? '0 0.375rem' : base.padding,
    }),
    clearIndicator: (base) => ({
      ...base,
      color: 'var(--vmci-text-muted)',
      padding: size === 'sm' ? '0 0.375rem' : base.padding,
    }),
    noOptionsMessage: (base) => ({ ...base, color: 'var(--vmci-text-muted)' }),
    loadingMessage: (base) => ({ ...base, color: 'var(--vmci-text-muted)' }),
  }
}

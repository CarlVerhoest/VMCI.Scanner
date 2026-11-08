import { useMemo } from 'react'
import { useLabels } from '../VMCIProvider/vmciContext'
import { booleanSelectLabels, type BooleanSelectLabels } from './Selector.labels'
import { Selector, type SingleSelectorProps } from './Selector'

interface BooleanOption {
  value: boolean
  label: string
}

export interface BooleanSelectProps extends Omit<
  SingleSelectorProps<BooleanOption>,
  | 'value'
  | 'onValueChanged'
  | 'options'
  | 'groups'
  | 'loadOptions'
  | 'valueLabel'
  | 'optionKey'
  | 'labels'
> {
  /** `null` is "unknown": nothing chosen yet. */
  value: boolean | null
  onValueChanged: (value: boolean | null) => void
  /** Overrides the default texts (yes / no / unknown). */
  labels?: Partial<BooleanSelectLabels>
}

/** Yes / no / unknown, e.g. "Vakantiegeld betaald?". Clearing returns to unknown (null). */
export function BooleanSelect({ value, onValueChanged, labels, ...rest }: BooleanSelectProps) {
  const text = useLabels('booleanSelect', booleanSelectLabels, labels)
  const options = useMemo<BooleanOption[]>(
    () => [
      { value: true, label: text.yes },
      { value: false, label: text.no },
    ],
    [text.yes, text.no],
  )
  return (
    <Selector<BooleanOption>
      isSearchable={false}
      placeholder={text.unknown}
      {...rest}
      options={options}
      valueLabel="label"
      optionKey={(o) => String(o.value)}
      value={value === null ? null : (options.find((o) => o.value === value) ?? null)}
      onValueChanged={(o) => onValueChanged(o ? o.value : null)}
    />
  )
}

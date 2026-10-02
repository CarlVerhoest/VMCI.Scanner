import DatePicker from 'react-datepicker'
import clsx from 'clsx'

import 'react-datepicker/dist/react-datepicker.css'
import './VMCIDatePicker.css'
import { getMachineDateFormat, getMachineDatePlaceholder, registerMachineLocale } from './dateLocale'

const machineLocaleCode = registerMachineLocale()

export interface VMCIDatePickerProps {
  value: Date | null
  onValueChanged: (newValue: Date | null) => void

  isInvalid?: boolean
  disabled?: boolean
  tabIndex?: number
}

// Adapted from KAZM.eSoar's MyDatePicker: plain `Date | null` instead of that
// project's custom moment.js-backed MyDateTime wrapper, since Scanner has no
// such type and moment.js is legacy/unmaintained - not something to newly
// depend on. react-datepicker + date-fns (already an Scanner dependency)
// cover the same locale-aware formatting without it.
export function VMCIDatePicker({ value, onValueChanged, isInvalid = false, disabled = false, tabIndex }: VMCIDatePickerProps) {
  return (
    <DatePicker
      locale={machineLocaleCode}
      className={clsx('form-control align-items-center w-100', isInvalid && 'is-invalid')}
      wrapperClassName="w-100"
      showIcon
      toggleCalendarOnIconClick
      dateFormat={getMachineDateFormat()}
      placeholderText={getMachineDatePlaceholder()}
      isClearable
      selected={value}
      onChange={onValueChanged}
      disabled={disabled}
      tabIndex={tabIndex}
    />
  )
}

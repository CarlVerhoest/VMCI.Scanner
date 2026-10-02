import { ChangeEvent, useLayoutEffect, useRef } from 'react'
import { Form } from 'react-bootstrap'
import { extractRrnDigits, maskRrnDigits, RRN_MASK } from './rrn'

export interface VMCIRRNInputProps {
  value: string | null
  onValueChanged: (newValue: string | null) => void

  isInvalid?: boolean
  disabled?: boolean
  tabIndex?: number
  autoFocus?: boolean
}

// The default control for entering a Belgian Rijksregisternummer (national register number).
// `value`/`onValueChanged` are the raw 11-digit string (or null when empty) - never the masked
// display text - so callers can hand it straight to rrn.ts's parseRrn/isValidRrn or to the
// backend as-is. Typing is displayed live-masked as ______-___-__ .
export function VMCIRRNInput({
  value,
  onValueChanged,
  isInvalid = false,
  disabled = false,
  tabIndex,
  autoFocus = false,
}: VMCIRRNInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  // Caret position to restore after the next render, since re-masking the value on every
  // keystroke would otherwise reset the caret to the end of the input.
  const pendingCaretIndex = useRef<number | null>(null)

  const maskedValue = maskRrnDigits(value ?? '')

  useLayoutEffect(() => {
    if (pendingCaretIndex.current === null || !inputRef.current) return
    inputRef.current.setSelectionRange(pendingCaretIndex.current, pendingCaretIndex.current)
    pendingCaretIndex.current = null
  })

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const newDigits = extractRrnDigits(event.target.value)
    const newMasked = maskRrnDigits(newDigits)

    pendingCaretIndex.current = lastDigitIndex(newMasked) + 1

    if (newDigits !== (value ?? '')) {
      onValueChanged(newDigits === '' ? null : newDigits)
    }
  }

  return (
    <Form.Control
      type="text"
      placeholder={RRN_MASK}
      value={maskedValue}
      onChange={handleChange}
      isInvalid={isInvalid}
      tabIndex={tabIndex}
      disabled={disabled}
      autoFocus={autoFocus}
      ref={inputRef}
    />
  )
}

function lastDigitIndex(masked: string): number {
  for (let i = masked.length - 1; i >= 0; i--) {
    if (/\d/.test(masked[i])) return i
  }
  return -1
}

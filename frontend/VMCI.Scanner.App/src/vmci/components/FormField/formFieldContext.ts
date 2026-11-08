import { createContext, useContext } from 'react'

/** What a FormField tells the control inside it. */
export interface FormFieldControlProps {
  /** Id for the control; the label points to it. */
  id: string
  /** Ids of the hint and error texts, for `aria-describedby`. */
  'aria-describedby': string | undefined
  'aria-invalid': true | undefined
  'aria-required': true | undefined
  isInvalid: boolean
  required: boolean
  disabled: boolean
  /** Only the DOM attributes, safe to spread on a native `<input>`/`<select>`/`<textarea>`. */
  inputProps: {
    id: string
    'aria-describedby': string | undefined
    'aria-invalid': true | undefined
    'aria-required': true | undefined
    disabled: boolean | undefined
  }
}

export const FormFieldContext = createContext<FormFieldControlProps | null>(null)

/**
 * The surrounding FormField's wiring, or `null` outside a FormField. VMCI input components
 * use this to link themselves to the label, hint and error without extra props.
 */
export function useFormField(): FormFieldControlProps | null {
  return useContext(FormFieldContext)
}

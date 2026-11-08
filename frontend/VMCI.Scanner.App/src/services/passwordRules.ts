import type { ValidationRule } from '@vmci/ui'

// Must match PasswordService.IsValidPassword in the API. Only the user's own password is held to
// this; the temporary password an administrator sets is not.
export const PASSWORD_RULE_TEXT = 'Minstens 8 tekens, met een hoofdletter, een kleine letter en een cijfer.'

/** The same rules one by one, for a live ValidationChecklist under the new-password field. */
export function passwordRules(password: string): ValidationRule[] {
  return [
    { key: 'length', label: 'Minstens 8 tekens', isValid: password.length >= 8 },
    { key: 'upper', label: 'Een hoofdletter', isValid: /[A-Z]/.test(password) },
    { key: 'lower', label: 'Een kleine letter', isValid: /[a-z]/.test(password) },
    { key: 'digit', label: 'Een cijfer', isValid: /\d/.test(password) },
  ]
}

export function passwordRuleError(password: string): string | null {
  return passwordRules(password).every((rule) => rule.isValid) ? null : PASSWORD_RULE_TEXT
}

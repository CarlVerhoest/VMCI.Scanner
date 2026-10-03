// Must match PasswordService.IsValidPassword in the API. Only the user's own password is held to
// this; the temporary password an administrator sets is not.
export const PASSWORD_RULE_TEXT = 'Minstens 8 tekens, met een hoofdletter, een kleine letter en een cijfer.'

export function passwordRuleError(password: string): string | null {
  const valid =
    password.length >= 8 && /[A-Z]/.test(password) && /[a-z]/.test(password) && /\d/.test(password)
  return valid ? null : PASSWORD_RULE_TEXT
}

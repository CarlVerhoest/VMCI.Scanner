// Belgian ondernemingsnummer (KBO / enterprise number) parsing and masking.
// Mirrors backend/VMCI.Scanner.Shared/EnterpriseNumber.cs - the two are the same rule stated twice and
// should be changed together, exactly as rrn.ts mirrors NationalRegisterNumber.cs.
//
// The rule, decided with the domain expert on 02/09/2026: the API stores the bare ten digits and
// every place a person reads the number shows it punctuated as '0558.916.572'.

const KBO_LENGTH = 10

// Strips everything but digits and caps at 10, so pasted punctuation and a leading 'BE' never have
// to be handled anywhere else.
export function extractKboDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, KBO_LENGTH)
}

// '0558916572' -> '0558.916.572'. Anything that isn't exactly 10 digits is returned as typed
// rather than forced into the mask, so a half-entered number still reads back as what was entered.
// The nine-digit pre-2008 VAT number is deliberately not padded - see EnterpriseNumber.Format.
export function maskKboDigits(value: string | null | undefined): string {
  if (!value) return ''

  const digits = extractKboDigits(value)
  if (digits.length !== KBO_LENGTH) return value

  return `${digits.slice(0, 4)}.${digits.slice(4, 7)}.${digits.slice(7)}`
}

// Belgian Rijksregisternummer (national register number) parsing/validation/masking.
// https://nl.wikipedia.org/wiki/Rijksregisternummer
// Internal to VMCIRRNInput - all of it operates on the raw 11-digit string (no punctuation).

export interface ParsedRRN {
  year: number
  month: number
  day: number
  isMale: boolean
  isBis: boolean
}

const RRN_LENGTH = 11
// The one shape a register number is shown in, screen and document alike: YYMMDD-SSS-CC.
// Aligned on 02/09/2026 - the app used to show '85.02.15-123.45' here while the generated C4 and
// the F1 printed '850215-123-45', which is the notation the RVA's own forms use. Mirrors
// backend/VMCI.Scanner.Shared/NationalRegisterNumber.Format; the two should change together.
export const RRN_MASK = '______-___-__'
const MASK_SEPARATOR_INDEXES = new Set([6, 10])

// The modulo-97 check digit was introduced in 1900 and re-based off "2" + the birth digits once
// the 1900-1999 range ran out, so a valid 11-digit string matches exactly one of the two.
function centuryOfBirth(digits: string): 1900 | 2000 | null {
  const nr = Number.parseInt(digits.slice(0, 9), 10)
  const checkDigit = Number.parseInt(digits.slice(9, 11), 10)
  if (97 - (nr % 97) === checkDigit) return 1900

  const nr2000 = Number.parseInt(`2${digits.slice(0, 9)}`, 10)
  if (97 - (nr2000 % 97) === checkDigit) return 2000

  return null
}

// Parses a raw 11-digit RRN string into its component fields, or null if it isn't exactly 11
// digits or fails the modulo-97 check digit.
export function parseRrn(digits: string | null | undefined): ParsedRRN | null {
  if (!digits || digits.length !== RRN_LENGTH) return null

  const century = centuryOfBirth(digits)
  if (century === null) return null

  // Month is offset by +20 (gender not encoded in the serial) or +40 (gender encoded, i.e. the
  // normal case below) for "bis" numbers, issued when someone doesn't have a normal RRN yet
  // (e.g. a newborn or a foreign national before full registration).
  const rawMonth = Number.parseInt(digits.slice(2, 4), 10)
  const isBis = rawMonth > 20
  const month = rawMonth > 40 ? rawMonth - 40 : isBis ? rawMonth - 20 : rawMonth

  const serialNr = Number.parseInt(digits.slice(6, 9), 10)

  return {
    year: century + Number.parseInt(digits.slice(0, 2), 10),
    month,
    day: Number.parseInt(digits.slice(4, 6), 10),
    isMale: serialNr % 2 === 1,
    isBis,
  }
}

export function isValidRrn(digits: string | null | undefined): boolean {
  return parseRrn(digits) !== null
}

// Strips everything but digits and caps at 11 (an RRN's fixed length), so pasted/typed
// punctuation never has to be handled anywhere else.
export function extractRrnDigits(value: string): string {
  return value.replace(/\D/g, '').slice(0, RRN_LENGTH)
}

// Re-inserts RRN_MASK's punctuation around up to 11 raw digits, e.g. '85021512345' ->
// '850215-123-45'; trailing positions stay as the mask's placeholder underscores.
export function maskRrnDigits(digits: string): string {
  if (!digits) return ''

  let masked = ''
  let digitIndex = 0

  for (let maskIndex = 0; maskIndex < RRN_MASK.length; maskIndex++) {
    if (MASK_SEPARATOR_INDEXES.has(maskIndex)) {
      masked += RRN_MASK[maskIndex]
    } else if (digitIndex < digits.length) {
      masked += digits[digitIndex]
      digitIndex++
    } else {
      masked += RRN_MASK[maskIndex]
    }
  }

  return masked
}

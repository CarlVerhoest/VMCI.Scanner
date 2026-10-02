import { registerLocale } from 'react-datepicker'
import { de } from 'date-fns/locale/de'
import { enUS } from 'date-fns/locale/en-US'
import { es } from 'date-fns/locale/es'
import { fr } from 'date-fns/locale/fr'
import { it } from 'date-fns/locale/it'
import { nl } from 'date-fns/locale/nl'
import { nlBE } from 'date-fns/locale/nl-BE'
import type { Locale } from 'date-fns'

// Trimmed down from KAZM.eSoar's LocaleHelper: date-fns only (that library is
// already an Scanner dependency), no moment.js. Only what VMCIDatePicker
// needs - locale registration plus the date format/placeholder for the
// browser's locale.
const LOCALE_MAP: Record<string, Locale> = {
  en: enUS,
  'en-US': enUS,
  'en-GB': enUS,
  nl,
  'nl-BE': nlBE,
  'nl-NL': nl,
  fr,
  'fr-BE': fr,
  'fr-FR': fr,
  de,
  'de-DE': de,
  es,
  'es-ES': es,
  it,
  'it-IT': it,
}

function getBrowserLocale(): string {
  return navigator.language || navigator.languages[0] || 'en-US'
}

function getDateFnsLocale(): { locale: Locale; code: string } {
  const browserLocale = getBrowserLocale()

  if (LOCALE_MAP[browserLocale]) {
    return { locale: LOCALE_MAP[browserLocale], code: browserLocale }
  }

  const languageCode = browserLocale.split('-')[0]
  if (LOCALE_MAP[languageCode]) {
    return { locale: LOCALE_MAP[languageCode], code: languageCode }
  }

  return { locale: enUS, code: 'en-US' }
}

// Registers the browser's locale with react-datepicker and returns its code.
export function registerMachineLocale(): string {
  const { locale, code } = getDateFnsLocale()
  registerLocale(code, locale)
  return code
}

export function getMachineDateFormat(): string {
  const locale = getBrowserLocale()

  if (locale.startsWith('en-US')) {
    return 'MM/dd/yyyy'
  }

  // en-GB, nl, fr, de, es, it and the default all read dd/MM/yyyy.
  return 'dd/MM/yyyy'
}

export function getMachineDatePlaceholder(): string {
  return getMachineDateFormat().toLowerCase()
}

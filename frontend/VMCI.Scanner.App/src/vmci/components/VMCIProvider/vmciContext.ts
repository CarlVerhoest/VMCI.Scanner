import { createContext, useContext, useMemo } from 'react'
import type { VMCILabelKey, VMCILabelOverrides, VMCILabelRegistry } from './labels'

export interface VMCIContextValue {
  labels: VMCILabelOverrides
  locale: string
}

export const DEFAULT_LOCALE = 'nl-BE'

export const VMCIContext = createContext<VMCIContextValue>({ labels: {}, locale: DEFAULT_LOCALE })

/**
 * Resolves a component's texts. Precedence: the `labels` prop, then VMCIProvider, then the
 * component's Dutch defaults. Works without a provider.
 */
export function useLabels<K extends VMCILabelKey>(
  key: K,
  defaults: VMCILabelRegistry[K],
  overrides?: Partial<VMCILabelRegistry[K]>,
): VMCILabelRegistry[K] {
  const fromProvider = useContext(VMCIContext).labels[key]
  return useMemo(
    () => ({ ...defaults, ...fromProvider, ...overrides }),
    [defaults, fromProvider, overrides],
  )
}

/** Locale for Intl formatting of numbers and dates (default `nl-BE`). */
export function useLocale(): string {
  return useContext(VMCIContext).locale
}

import { useContext, useMemo, type ReactNode } from 'react'
import type { VMCILabelKey, VMCILabelOverrides } from './labels'
import { VMCIContext, type VMCIContextValue } from './vmciContext'

export interface VMCIProviderProps {
  /** Text overrides per component, e.g. `{ themeSwitch: { label: 'Dark mode' } }`. */
  labels?: VMCILabelOverrides
  /** Locale for number and date formatting. Inherited from an outer provider, else `nl-BE`. */
  locale?: string
  children?: ReactNode
}

/**
 * App-wide settings for VMCI components. Optional: without it components use Dutch texts
 * and the `nl-BE` locale. Providers can be nested; inner values win per text.
 */
export function VMCIProvider({ labels, locale, children }: VMCIProviderProps) {
  const parent = useContext(VMCIContext)

  const value = useMemo<VMCIContextValue>(() => {
    const merged: Record<string, object | undefined> = { ...parent.labels }
    for (const [key, texts] of Object.entries(labels ?? {})) {
      merged[key] = { ...parent.labels[key as VMCILabelKey], ...texts }
    }
    return { labels: merged as VMCILabelOverrides, locale: locale ?? parent.locale }
  }, [parent, labels, locale])

  return <VMCIContext.Provider value={value}>{children}</VMCIContext.Provider>
}

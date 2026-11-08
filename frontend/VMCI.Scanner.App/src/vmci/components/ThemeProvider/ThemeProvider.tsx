import { useCallback, useEffect, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type Theme, type ThemeContextValue } from './themeContext'

export interface ThemeProviderProps {
  children?: ReactNode
  /**
   * Theme to start with when nothing is stored. `system` follows the OS setting
   * (`prefers-color-scheme`) and keeps following it until the user picks a theme.
   */
  defaultTheme?: Theme | 'system'
  /**
   * Controlled theme, e.g. a value loaded from the user's profile on the server.
   * When set, the provider only reports changes through `onThemeChanged`.
   */
  theme?: Theme
  /** Called whenever the user picks a theme; use it to save the choice on the server. */
  onThemeChanged?: (theme: Theme) => void
  /** localStorage key for the user's choice; `null` disables storage. */
  storageKey?: string | null
}

const isTheme = (value: unknown): value is Theme => value === 'light' || value === 'dark'

// Storage can throw (private mode, blocked site data); theming must still work.
function readStored(key: string | null): Theme | null {
  if (!key) return null
  try {
    const value = window.localStorage.getItem(key)
    return isTheme(value) ? value : null
  } catch {
    return null
  }
}

function writeStored(key: string | null, theme: Theme) {
  if (!key) return
  try {
    window.localStorage.setItem(key, theme)
  } catch {
    // ignore
  }
}

const darkQuery = () =>
  typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia('(prefers-color-scheme: dark)')
    : null

const systemTheme = (): Theme => (darkQuery()?.matches ? 'dark' : 'light')

/**
 * Sets `data-bs-theme` on `<html>` (decision D7): Bootstrap and every `--vmci-*` token
 * follow it, so components never need to know the theme themselves.
 */
export function ThemeProvider({
  children,
  defaultTheme = 'system',
  theme: controlledTheme,
  onThemeChanged,
  storageKey = 'vmci-theme',
}: ThemeProviderProps) {
  const [stored] = useState(() => readStored(storageKey))
  const [userChose, setUserChose] = useState(stored !== null)
  const [internalTheme, setInternalTheme] = useState<Theme>(
    () => stored ?? (defaultTheme === 'system' ? systemTheme() : defaultTheme),
  )
  const theme = controlledTheme ?? internalTheme

  // Before paint, so there is no flash of the wrong theme.
  useLayoutEffect(() => {
    document.documentElement.setAttribute('data-bs-theme', theme)
  }, [theme])

  // Follow OS changes until the user makes an explicit choice.
  useEffect(() => {
    if (controlledTheme || userChose || defaultTheme !== 'system') return
    const query = darkQuery()
    if (!query) return
    const onChange = (e: MediaQueryListEvent) => setInternalTheme(e.matches ? 'dark' : 'light')
    query.addEventListener('change', onChange)
    return () => query.removeEventListener('change', onChange)
  }, [controlledTheme, userChose, defaultTheme])

  const setTheme = useCallback(
    (next: Theme) => {
      setUserChose(true)
      if (controlledTheme === undefined) setInternalTheme(next)
      writeStored(storageKey, next)
      onThemeChanged?.(next)
    },
    [controlledTheme, storageKey, onThemeChanged],
  )

  const value = useMemo<ThemeContextValue>(
    () => ({ theme, setTheme, toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark') }),
    [theme, setTheme],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

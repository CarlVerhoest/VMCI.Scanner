import { useSyncExternalStore } from 'react'

/** Bootstrap 5 breakpoints (min-width, px). */
export const BREAKPOINTS = { sm: 576, md: 768, lg: 992, xl: 1200, xxl: 1400 } as const
export type Breakpoint = keyof typeof BREAKPOINTS

/** True while the media query matches; follows changes (rotation, resizing). */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      if (typeof window.matchMedia !== 'function') return () => {}
      const list = window.matchMedia(query)
      list.addEventListener('change', onChange)
      return () => list.removeEventListener('change', onChange)
    },
    () => (typeof window.matchMedia === 'function' ? window.matchMedia(query).matches : true),
    () => true,
  )
}

/** True from the breakpoint up (`min-width`). `false` as breakpoint means always true. */
export function useBreakpointUp(breakpoint: Breakpoint | false): boolean {
  const matches = useMediaQuery(`(min-width: ${breakpoint ? BREAKPOINTS[breakpoint] : 0}px)`)
  return breakpoint === false ? true : matches
}

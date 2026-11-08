import { useSyncExternalStore } from 'react'

// App-wide count of in-flight requests, driving one global <Spinner active={useHttpActivity()}>.
// Library-agnostic: an app calls begin/end from its HTTP layer (axios interceptors, a fetch
// wrapper, …). Same names as the per-app hooks it replaces.

type Listener = () => void

let activeRequestCount = 0
const listeners = new Set<Listener>()

function notify() {
  listeners.forEach((listener) => listener())
}

/** Call when a request starts (e.g. in an axios request interceptor). */
export function beginHttpRequest(): void {
  activeRequestCount += 1
  notify()
}

/** Call when a request ends, on success AND on error, or the spinner stays on. */
export function endHttpRequest(): void {
  activeRequestCount = Math.max(0, activeRequestCount - 1)
  notify()
}

function subscribe(listener: Listener) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

const getSnapshot = () => activeRequestCount > 0

/** True while at least one request is in flight. */
export function useHttpActivity(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}

/** For tests: forget all in-flight requests. */
export function resetHttpActivity(): void {
  activeRequestCount = 0
  notify()
}

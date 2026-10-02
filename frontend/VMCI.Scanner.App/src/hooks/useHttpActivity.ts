import { useSyncExternalStore } from 'react'

type Listener = () => void

// Count of in-flight axiosInstance requests, mutated only by axiosConfig.ts's interceptors
// (see beginHttpRequest/endHttpRequest below) - nothing else should touch this directly.
let activeRequestCount = 0
const listeners = new Set<Listener>()

function notify(): void {
  listeners.forEach((listener) => listener())
}

// Called from axiosConfig.ts's request interceptor. Not for application code - services
// automatically get this for free by going through the shared axiosInstance.
export function beginHttpRequest(): void {
  activeRequestCount += 1
  notify()
}

// Called from axiosConfig.ts's response interceptor, on both success and error, so a failed
// request doesn't leave the counter (and the global spinner) stuck on forever.
export function endHttpRequest(): void {
  activeRequestCount = Math.max(0, activeRequestCount - 1)
  notify()
}

function subscribe(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

function getSnapshot(): boolean {
  return activeRequestCount > 0
}

// True while at least one axiosInstance request is in flight. Drives the app-wide VMCISpinner
// in App.tsx - see the "Global loading spinner" section in this app's CLAUDE.md before adding
// any per-page loading spinner of your own.
export function useHttpActivity(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}

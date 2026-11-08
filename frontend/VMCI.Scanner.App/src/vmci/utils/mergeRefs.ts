import type { MutableRefObject, Ref, RefCallback } from 'react'

/** Lets a component use its own ref and still forward the caller's ref. */
export function mergeRefs<T>(...refs: (Ref<T> | undefined)[]): RefCallback<T> {
  return (value) => {
    for (const ref of refs) {
      if (typeof ref === 'function') ref(value)
      // React 18's types mark RefObject.current read-only; React 19's do not.
      else if (ref) (ref as MutableRefObject<T | null>).current = value
    }
  }
}

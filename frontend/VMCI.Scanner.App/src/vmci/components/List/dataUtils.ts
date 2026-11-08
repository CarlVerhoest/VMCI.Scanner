import type { Key, ReactNode } from 'react'

export type RowKey<T> = keyof T | ((row: T, index: number) => Key)

/** Stable key of a row: the given property or function, else its index. */
export function keyOfRow<T>(row: T, index: number, rowKey: RowKey<T> | undefined): string {
  if (rowKey === undefined) return String(index)
  if (typeof rowKey === 'function') return String(rowKey(row, index))
  return String(row[rowKey])
}

/** A value from a row shown as text; null and undefined show nothing. */
export function displayValue(value: unknown): ReactNode {
  if (value === null || value === undefined) return null
  if (typeof value === 'boolean') return value ? '✓' : ''
  return value as ReactNode
}

/** The header as content: a string, a node, or a function returning one. */
export function renderHeader(header: ReactNode | (() => ReactNode)): ReactNode {
  return typeof header === 'function' ? header() : header
}

/** Text of a header for a card label and accessible names. */
export function headerText(header: ReactNode | (() => ReactNode)): string {
  const content = renderHeader(header)
  return typeof content === 'string' || typeof content === 'number' ? String(content) : ''
}

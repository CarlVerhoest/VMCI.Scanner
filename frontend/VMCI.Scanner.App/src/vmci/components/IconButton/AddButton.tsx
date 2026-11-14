import { forwardRef, useEffect, useMemo, useRef } from 'react'
import clsx from 'clsx'
import { faSquarePlus } from '@fortawesome/free-solid-svg-icons'
import { mergeRefs } from '../../utils/mergeRefs'
import { useLabels } from '../VMCIProvider/vmciContext'
import { addButtonLabels, type AddButtonLabels } from './AddButton.labels'
import { IconButton, type IconButtonProps } from './IconButton'

export interface AddButtonProps extends Omit<IconButtonProps, 'icon' | 'label'> {
  /**
   * Also press the button with the `+`, `p` or `P` key anywhere on the page, except while
   * typing in a field. Use at most once per page.
   */
  keyboardShortcut?: boolean
  /** Overrides the default texts. */
  labels?: Partial<AddButtonLabels>
}

const SHORTCUT_KEYS = ['+', 'p', 'P']

function isTyping(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)
}

/** IconButton preset for "add": green plus icon, optional keyboard shortcut. */
export const AddButton = forwardRef<HTMLButtonElement, AddButtonProps>(function AddButton(
  { keyboardShortcut = false, labels, className, disabled, ...rest },
  ref,
) {
  const text = useLabels('addButton', addButtonLabels, labels)
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const setRefs = useMemo(() => mergeRefs(buttonRef, ref), [ref])

  useEffect(() => {
    if (!keyboardShortcut || disabled) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.ctrlKey || event.metaKey || event.altKey || isTyping(event.target)) return
      if (!SHORTCUT_KEYS.includes(event.key)) return
      event.preventDefault()
      // A real click, so onClick gets a normal event and focus handling stays consistent.
      buttonRef.current?.click()
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [keyboardShortcut, disabled])

  return (
    <IconButton
      ref={setRefs}
      icon={faSquarePlus}
      label={text.label}
      aria-keyshortcuts={keyboardShortcut ? '+ p' : undefined}
      {...rest}
      disabled={disabled}
      className={clsx('text-success', className)}
    />
  )
})

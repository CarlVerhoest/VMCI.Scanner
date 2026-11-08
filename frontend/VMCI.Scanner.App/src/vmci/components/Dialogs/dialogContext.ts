import { createContext, useContext, type ReactNode } from 'react'
import type { MessageButtons, MessageResult, MessageTone } from './MessageDialog'

export interface ConfirmOptions {
  title: ReactNode
  message?: ReactNode
  details?: ReactNode
  confirmLabel?: string
  variant?: 'danger' | 'primary'
  /**
   * Runs when the user confirms, with the dialog showing "busy". If it throws, the error's
   * message is shown in the dialog and the user can retry or cancel.
   */
  action?: () => Promise<void> | void
}

export interface MessageOptions {
  title: ReactNode
  message?: ReactNode
  details?: ReactNode
  buttons?: MessageButtons
  tone?: MessageTone
}

export interface DialogApi {
  /** Resolves true when confirmed (and `action` succeeded), false when cancelled. */
  confirm: (options: ConfirmOptions) => Promise<boolean>
  /** Resolves with the button chosen. */
  message: (options: MessageOptions) => Promise<MessageResult>
}

export const DialogContext = createContext<DialogApi | null>(null)

function useDialogApi(): DialogApi {
  const api = useContext(DialogContext)
  if (!api) throw new Error('useConfirm and useMessage need a DialogProvider above them')
  return api
}

/** `const confirm = useConfirm(); if (await confirm({ title: 'Verwijderen?' })) …` */
export function useConfirm(): DialogApi['confirm'] {
  return useDialogApi().confirm
}

/** `const message = useMessage(); await message({ title: 'Opgeslagen', tone: 'success' })` */
export function useMessage(): DialogApi['message'] {
  return useDialogApi().message
}

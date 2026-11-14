import { forwardRef, type ComponentPropsWithoutRef } from 'react'
import clsx from 'clsx'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import './IconButton.css'

export type IconButtonVariant =
  | 'plain'
  | 'primary'
  | 'secondary'
  | 'success'
  | 'danger'
  | 'warning'
  | 'info'
  | 'outline-primary'
  | 'outline-secondary'
  | 'outline-danger'

export interface IconButtonProps extends Omit<ComponentPropsWithoutRef<'button'>, 'children'> {
  /** The icon (Font Awesome IconDefinition). */
  icon: IconDefinition
  /** What the button does. Accessible name and tooltip; visible when `showLabel`. */
  label: string
  /** Show the label as text next to the icon. */
  showLabel?: boolean
  /** `plain` is a borderless icon in the current text colour; others are Bootstrap buttons. */
  variant?: IconButtonVariant
  size?: 'sm' | 'lg'
}

/** A real, focusable button with an icon. Never use a clickable `<span>` with an icon. */
export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  {
    icon,
    label,
    showLabel = false,
    variant = 'plain',
    size,
    type = 'button',
    title,
    className,
    ...rest
  },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      title={title ?? (showLabel ? undefined : label)}
      aria-label={showLabel ? undefined : label}
      {...rest}
      className={clsx(
        'btn vmci-icon-button',
        variant === 'plain' ? 'vmci-icon-button--plain' : `btn-${variant}`,
        size && `btn-${size} vmci-icon-button--${size}`,
        showLabel && 'vmci-icon-button--with-label',
        className,
      )}
    >
      <FontAwesomeIcon icon={icon} fixedWidth aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </button>
  )
})

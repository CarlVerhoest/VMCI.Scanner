import { forwardRef, useId, type ComponentPropsWithoutRef } from 'react'
import clsx from 'clsx'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../ThemeProvider/themeContext'
import { useLabels } from '../VMCIProvider/vmciContext'
import { themeSwitchLabels, type ThemeSwitchLabels } from './ThemeSwitch.labels'
import './ThemeSwitch.css'

export interface ThemeSwitchProps extends Omit<
  ComponentPropsWithoutRef<'input'>,
  'type' | 'checked' | 'defaultChecked' | 'onChange' | 'value' | 'size'
> {
  /** Hide the label visually; it stays available to screen readers. */
  hideLabel?: boolean
  /** Show a sun or moon icon before the label. */
  showIcon?: boolean
  /** Class for the wrapper element (`className` goes to the input). */
  wrapperClassName?: string
  /** Overrides the default texts. */
  labels?: Partial<ThemeSwitchLabels>
}

/**
 * Switch between light and dark mode. Reads and sets the theme of the nearest
 * ThemeProvider; replaces the per-app ThemeToggle and settings switches.
 */
export const ThemeSwitch = forwardRef<HTMLInputElement, ThemeSwitchProps>(function ThemeSwitch(
  {
    hideLabel = false,
    showIcon = true,
    wrapperClassName,
    labels,
    id,
    className,
    disabled,
    ...rest
  },
  ref,
) {
  const { theme, setTheme } = useTheme()
  const text = useLabels('themeSwitch', themeSwitchLabels, labels)
  const generatedId = useId()
  const inputId = id ?? generatedId
  const isDark = theme === 'dark'

  return (
    <div className={clsx('form-check form-switch vmci-theme-switch', wrapperClassName)}>
      <input
        ref={ref}
        {...rest}
        id={inputId}
        type="checkbox"
        role="switch"
        className={clsx('form-check-input', className)}
        checked={isDark}
        disabled={disabled}
        onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
      />
      <label htmlFor={inputId} className={clsx('form-check-label', hideLabel && 'visually-hidden')}>
        {showIcon && (
          <FontAwesomeIcon
            icon={isDark ? faMoon : faSun}
            className="vmci-theme-switch__icon"
            fixedWidth
          />
        )}
        {text.label}
      </label>
    </div>
  )
})

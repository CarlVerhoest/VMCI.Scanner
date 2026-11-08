import { createContext, useContext, type ReactNode } from 'react'
import clsx from 'clsx'
import Dropdown from 'react-bootstrap/Dropdown'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { useLabels } from '../VMCIProvider/vmciContext'
import { actionMenuLabels, type ActionMenuLabels } from './ActionMenu.labels'
import './ActionMenu.css'

// Holds the row object for the items; wrapped so `null` can be a legitimate row value.
const ActionMenuContext = createContext<{ dataObject: unknown } | null>(null)

export interface ActionMenuProps<T> {
  /** The row (or other object) every item's `onClick` receives. */
  dataObject: T
  /** Class for the toggle, e.g. a `text-*` colour. */
  className?: string
  /** Make the toggle's name specific, e.g. "Acties voor OO-ABC". */
  'aria-label'?: string
  disabled?: boolean
  children?: ReactNode
  /** Overrides the default texts. */
  labels?: Partial<ActionMenuLabels>
}

export interface ActionMenuItemProps<T> {
  label: string
  icon?: IconDefinition
  disabled?: boolean
  hidden?: boolean
  /** Red text, for destructive actions. */
  danger?: boolean
  onClick: (dataObject: T) => void
}

function ActionMenuItem<T>({
  label,
  icon,
  disabled,
  hidden,
  danger,
  onClick,
}: ActionMenuItemProps<T>) {
  const context = useContext(ActionMenuContext)
  if (!context) throw new Error('ActionMenu.Item can only be used within ActionMenu')
  if (hidden) return null
  return (
    <Dropdown.Item
      as="button"
      type="button"
      active={false}
      disabled={disabled}
      className={clsx('vmci-action-menu__item', danger && 'vmci-action-menu__item--danger')}
      onClick={() => onClick(context.dataObject as T)}
    >
      {icon && <FontAwesomeIcon icon={icon} fixedWidth aria-hidden="true" />}
      <span>{label}</span>
    </Dropdown.Item>
  )
}

/**
 * The "⋮" menu of actions for one row. `dataObject` is given once and handed to every
 * `ActionMenu.Item`'s `onClick`. Put it in a Table column with `fitContent`.
 */
export function ActionMenu<T>({
  dataObject,
  className,
  disabled,
  children,
  labels,
  ...aria
}: ActionMenuProps<T>) {
  const text = useLabels('actionMenu', actionMenuLabels, labels)
  const name = aria['aria-label'] ?? text.toggle
  return (
    <ActionMenuContext.Provider value={{ dataObject }}>
      <Dropdown className="vmci-action-menu">
        <Dropdown.Toggle
          bsPrefix="vmci-action-menu__toggle"
          // No variant: react-bootstrap would add btn-primary.
          variant=""
          className={clsx('btn', className)}
          aria-label={name}
          title={name}
          disabled={disabled}
        >
          <FontAwesomeIcon icon={faEllipsisVertical} fixedWidth aria-hidden="true" />
        </Dropdown.Toggle>
        {/* Fixed positioning so the menu escapes a scrolling table. */}
        <Dropdown.Menu align="end" popperConfig={{ strategy: 'fixed' }}>
          {children}
        </Dropdown.Menu>
      </Dropdown>
    </ActionMenuContext.Provider>
  )
}

ActionMenu.Item = ActionMenuItem

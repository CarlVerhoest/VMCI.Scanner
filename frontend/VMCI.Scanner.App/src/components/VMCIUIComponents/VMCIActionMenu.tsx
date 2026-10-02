import { createContext, ReactNode, useContext } from 'react'
import { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faEllipsisVertical } from '@fortawesome/free-solid-svg-icons'
import { Dropdown } from 'react-bootstrap'

// Not exported - only reachable through VMCIActionMenu/VMCIActionMenu.Item below, which is
// what keeps the `as T` cast in ActionItem safe despite the context itself being untyped.
const ActionMenuContext = createContext<unknown>(null)

export interface VMCIActionMenuProps<T> {
  dataObject: T
  color?: string
  children?: ReactNode
}

export interface VMCIActionItemProps<T> {
  label: string
  icon: IconDefinition
  disabled?: boolean
  hidden?: boolean
  onClick: (dataObject: T) => void
}

// Private - not exported directly, only accessible via VMCIActionMenu.Item
function ActionItem<T>({ label, icon, onClick, disabled, hidden }: VMCIActionItemProps<T>) {
  const dataObject = useContext(ActionMenuContext)

  if (dataObject === null) {
    throw new Error('VMCIActionMenu.Item can only be used within VMCIActionMenu')
  }

  if (hidden) return null

  return (
    <Dropdown.Item active={false} disabled={disabled} onClick={() => onClick(dataObject as T)}>
      <span>
        <FontAwesomeIcon icon={icon} />
        &nbsp;&nbsp;
        {label}
      </span>
    </Dropdown.Item>
  )
}

// Per-row "..." dropdown menu. `dataObject` is provided once here and threaded to every
// VMCIActionMenu.Item's onClick via context, so callers don't have to repeat it per item.
export function VMCIActionMenu<T>({ dataObject, color, children }: VMCIActionMenuProps<T>) {
  return (
    <ActionMenuContext.Provider value={dataObject}>
      <Dropdown>
        <Dropdown.Toggle
          bsPrefix="border-0 bg-transparent"
          className="text-secondary d-inline-flex align-items-center justify-content-center"
          style={{ width: '2.25rem', height: '2.25rem', padding: 0 }}
        >
          <FontAwesomeIcon icon={faEllipsisVertical} color={color} size="lg" />
        </Dropdown.Toggle>
        <Dropdown.Menu className="dropdown-menu-end">{children}</Dropdown.Menu>
      </Dropdown>
    </ActionMenuContext.Provider>
  )
}

// Only way to access ActionItem is through VMCIActionMenu.Item
VMCIActionMenu.Item = ActionItem

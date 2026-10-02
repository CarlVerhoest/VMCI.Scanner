import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import type { SizeProp } from '@fortawesome/fontawesome-svg-core'
import { faArrowUp, faArrowDown, faFilterCircleXmark } from '@fortawesome/free-solid-svg-icons'

export type SortIconState = 'asc' | 'desc' | 'unsorted'

interface SortIconProps {
  state: SortIconState
  size?: SizeProp
}

// Directly-imported icon objects (no global FontAwesome library.add registration
// required), so this stays typesafe end to end.
export function SortIcon({ state, size = 'sm' }: SortIconProps) {
  if (state === 'unsorted') {
    return (
      <span className="d-inline-block text-center">
        <FontAwesomeIcon icon={faArrowUp} size={size} className="text-body-secondary opacity-50" />
      </span>
    )
  }

  return (
    <span className="d-inline-block text-center">
      <FontAwesomeIcon icon={state === 'asc' ? faArrowUp : faArrowDown} size={size} className="text-body" />
    </span>
  )
}

export function ClearFilterIcon() {
  return <FontAwesomeIcon icon={faFilterCircleXmark} />
}

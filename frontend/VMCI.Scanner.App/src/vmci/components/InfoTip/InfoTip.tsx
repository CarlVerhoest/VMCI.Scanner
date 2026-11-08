import {
  forwardRef,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
  type ComponentPropsWithoutRef,
  type ReactNode,
} from 'react'
import clsx from 'clsx'
import Overlay from 'react-bootstrap/Overlay'
import Tooltip from 'react-bootstrap/Tooltip'
import type { Placement } from 'react-bootstrap/types'
import type { IconDefinition } from '@fortawesome/fontawesome-svg-core'
import { faCircleInfo } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { mergeRefs } from '../../utils/mergeRefs'
import { useLabels } from '../VMCIProvider/vmciContext'
import { infoTipLabels, type InfoTipLabels } from './InfoTip.labels'
import './InfoTip.css'

export interface InfoTipProps extends Omit<ComponentPropsWithoutRef<'button'>, 'content'> {
  /** The explanation shown in the tooltip. */
  content: ReactNode
  /** Icon of the button. Default: circle-info. */
  icon?: IconDefinition
  /** Preferred side; `auto` picks the side with most room. */
  placement?: Placement
  /** Overrides the default texts. */
  labels?: Partial<InfoTipLabels>
}

/**
 * Info icon with an explanation. Opens on hover and keyboard focus, toggles on tap/click
 * (so it works on touch screens), closes with Escape or a click elsewhere.
 */
export const InfoTip = forwardRef<HTMLButtonElement, InfoTipProps>(function InfoTip(
  { content, icon = faCircleInfo, placement = 'auto', labels, className, ...rest },
  ref,
) {
  const text = useLabels('infoTip', infoTipLabels, labels)
  const tooltipId = useId()
  const buttonRef = useRef<HTMLButtonElement | null>(null)
  const setRefs = useMemo(() => mergeRefs(buttonRef, ref), [ref])
  const [hovered, setHovered] = useState(false)
  const [focused, setFocused] = useState(false)
  const [pinned, setPinned] = useState(false)
  const show = hovered || focused || pinned

  useEffect(() => {
    if (!show) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setHovered(false)
      setFocused(false)
      setPinned(false)
    }
    const onPointerDown = (event: PointerEvent) => {
      if (!buttonRef.current?.contains(event.target as Node)) setPinned(false)
    }
    document.addEventListener('keydown', onKeyDown)
    document.addEventListener('pointerdown', onPointerDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.removeEventListener('pointerdown', onPointerDown)
    }
  }, [show])

  return (
    <>
      <button
        ref={setRefs}
        type="button"
        aria-label={text.label}
        aria-describedby={show ? tooltipId : undefined}
        aria-expanded={pinned}
        {...rest}
        className={clsx('vmci-info-tip', className)}
        onMouseEnter={(e) => {
          setHovered(true)
          rest.onMouseEnter?.(e)
        }}
        onMouseLeave={(e) => {
          setHovered(false)
          rest.onMouseLeave?.(e)
        }}
        onFocus={(e) => {
          setFocused(true)
          rest.onFocus?.(e)
        }}
        onBlur={(e) => {
          setFocused(false)
          setPinned(false)
          rest.onBlur?.(e)
        }}
        onClick={(e) => {
          setPinned((p) => !p)
          rest.onClick?.(e)
        }}
      >
        <FontAwesomeIcon icon={icon} aria-hidden="true" />
      </button>
      <Overlay target={buttonRef.current} show={show} placement={placement}>
        {(overlayProps) => (
          <Tooltip id={tooltipId} {...overlayProps}>
            {content}
          </Tooltip>
        )}
      </Overlay>
    </>
  )
})

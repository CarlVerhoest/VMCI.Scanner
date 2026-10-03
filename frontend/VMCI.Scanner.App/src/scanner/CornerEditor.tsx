import { useEffect, useLayoutEffect, useMemo, useRef, useState, type PointerEvent } from 'react'
import { clampPoint, fullQuad, isConvex, nearestCorner, type Point, type Quad } from './geometry'
import { downscale } from './imaging'
import type { ScannerLabels } from './labels'

interface CornerEditorProps {
  /** The decoded photo; corner coordinates are in its pixels. */
  source: HTMLCanvasElement
  initialQuad: Quad
  /** What detection found, for the "Automatisch" reset; null when it found nothing. */
  detectedQuad: Quad | null
  labels: ScannerLabels
  onApply: (quad: Quad) => void
  onCancel: () => void
}

const DISPLAY_LONG_SIDE = 1600
const HANDLE_RADIUS_PX = 14
const GRAB_RADIUS_PX = 44
const MAGNIFIER_PX = 128
const MAGNIFIER_ZOOM = 3

/**
 * The photo with the quadrilateral drawn over it and four draggable corner handles.
 *
 * The SVG overlay uses the source image's pixel space as its viewBox, with the same
 * "contain" fitting as the image underneath, so a pointer position maps to image coordinates
 * through the SVG's own transform and nothing has to be recomputed on resize.
 */
export function CornerEditor({
  source,
  initialQuad,
  detectedQuad,
  labels,
  onApply,
  onCancel,
}: CornerEditorProps) {
  const [quad, setQuad] = useState<Quad>(initialQuad)
  const [dragging, setDragging] = useState<{ index: number; pointer: Point } | null>(null)
  const [pxPerUnit, setPxPerUnit] = useState(1)

  const stageRef = useRef<HTMLDivElement>(null)
  const svgRef = useRef<SVGSVGElement>(null)
  const displayRef = useRef<HTMLCanvasElement>(null)
  const magnifierRef = useRef<HTMLCanvasElement>(null)
  const grabOffset = useRef<Point>({ x: 0, y: 0 })

  const size = useMemo(() => ({ width: source.width, height: source.height }), [source])
  const display = useMemo(() => downscale(source, DISPLAY_LONG_SIDE), [source])
  const valid = isConvex(quad)

  // Paint the display copy once per source.
  useLayoutEffect(() => {
    const canvas = displayRef.current
    if (!canvas) return
    canvas.width = display.width
    canvas.height = display.height
    canvas.getContext('2d')?.drawImage(display, 0, 0)
  }, [display])

  // Handles keep a constant on-screen size, so track how many screen pixels one image pixel is.
  useEffect(() => {
    const stage = stageRef.current
    if (!stage) return
    const update = () => {
      const rect = stage.getBoundingClientRect()
      const scale = Math.min(rect.width / size.width, rect.height / size.height)
      if (scale > 0) setPxPerUnit(scale)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(stage)
    return () => observer.disconnect()
  }, [size])

  const toImagePoint = (event: PointerEvent): Point | null => {
    const svg = svgRef.current
    const matrix = svg?.getScreenCTM()
    if (!svg || !matrix) return null
    const p = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse())
    return { x: p.x, y: p.y }
  }

  const handlePointerDown = (event: PointerEvent<SVGSVGElement>) => {
    const p = toImagePoint(event)
    if (!p) return
    const index = nearestCorner(quad, p, GRAB_RADIUS_PX / pxPerUnit)
    if (index < 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    grabOffset.current = { x: quad[index].x - p.x, y: quad[index].y - p.y }
    setDragging({ index, pointer: { x: event.clientX, y: event.clientY } })
  }

  const handlePointerMove = (event: PointerEvent<SVGSVGElement>) => {
    if (!dragging) return
    const p = toImagePoint(event)
    if (!p) return
    const moved = clampPoint(
      { x: p.x + grabOffset.current.x, y: p.y + grabOffset.current.y },
      size
    )
    setQuad((current) => current.map((c, i) => (i === dragging.index ? moved : c)) as Quad)
    setDragging({ index: dragging.index, pointer: { x: event.clientX, y: event.clientY } })
  }

  const endDrag = () => setDragging(null)

  // The finger hides the corner it is dragging, so show an enlarged view of it elsewhere.
  useEffect(() => {
    const canvas = magnifierRef.current
    if (!dragging || !canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    const ratio = window.devicePixelRatio || 1
    canvas.width = MAGNIFIER_PX * ratio
    canvas.height = MAGNIFIER_PX * ratio

    const corner = quad[dragging.index]
    const regionSize = MAGNIFIER_PX / (pxPerUnit * MAGNIFIER_ZOOM)
    ctx.fillStyle = '#000'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(
      source,
      corner.x - regionSize / 2,
      corner.y - regionSize / 2,
      regionSize,
      regionSize,
      0,
      0,
      canvas.width,
      canvas.height
    )
    const mid = canvas.width / 2
    ctx.strokeStyle = 'rgba(255, 64, 64, 0.95)'
    ctx.lineWidth = 2 * ratio
    ctx.beginPath()
    ctx.moveTo(mid, 0)
    ctx.lineTo(mid, canvas.height)
    ctx.moveTo(0, mid)
    ctx.lineTo(canvas.width, mid)
    ctx.stroke()
  }, [dragging, quad, source, pxPerUnit])

  const magnifierStyle = (() => {
    const stage = stageRef.current
    if (!dragging || !stage) return undefined
    const rect = stage.getBoundingClientRect()
    const x = dragging.pointer.x - rect.left
    const y = dragging.pointer.y - rect.top
    // Above the finger, or below it when there is no room above; never off the stage.
    const gap = 48
    let top = y - gap - MAGNIFIER_PX
    if (top < 0) top = y + gap
    const left = Math.min(Math.max(x - MAGNIFIER_PX / 2, 0), rect.width - MAGNIFIER_PX)
    return { top, left, width: MAGNIFIER_PX, height: MAGNIFIER_PX }
  })()

  const r = HANDLE_RADIUS_PX / pxPerUnit
  const stroke = 2 / pxPerUnit
  const points = quad.map((p) => `${p.x},${p.y}`).join(' ')
  const shade = `M0,0 H${size.width} V${size.height} H0 Z M${quad
    .map((p) => `${p.x},${p.y}`)
    .join(' L')} Z`

  return (
    <div className="scanner-module__editor">
      <p className="scanner-module__hint">{labels.editorHint}</p>

      <div className="scanner-module__stage" ref={stageRef}>
        <canvas className="scanner-module__photo" ref={displayRef} />
        <svg
          ref={svgRef}
          className="scanner-module__overlay"
          viewBox={`0 0 ${size.width} ${size.height}`}
          preserveAspectRatio="xMidYMid meet"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
        >
          <path d={shade} fillRule="evenodd" className="scanner-module__shade" />
          <polygon
            points={points}
            className={valid ? 'scanner-module__quad' : 'scanner-module__quad is-invalid'}
            strokeWidth={stroke}
          />
          {quad.map((p, i) => (
            <circle
              key={i}
              cx={p.x}
              cy={p.y}
              r={r}
              strokeWidth={stroke}
              className={
                dragging?.index === i
                  ? 'scanner-module__handle is-active'
                  : 'scanner-module__handle'
              }
            />
          ))}
        </svg>
        {dragging && (
          <canvas className="scanner-module__magnifier" ref={magnifierRef} style={magnifierStyle} />
        )}
      </div>

      {!valid && <p className="scanner-module__error">{labels.invalidQuad}</p>}

      <div className="scanner-module__toolbar">
        {detectedQuad && (
          <button type="button" className="scanner-module__button" onClick={() => setQuad(detectedQuad)}>
            {labels.autoDetect}
          </button>
        )}
        <button type="button" className="scanner-module__button" onClick={() => setQuad(fullQuad(size))}>
          {labels.fullImage}
        </button>
        <span className="scanner-module__spacer" />
        <button type="button" className="scanner-module__button" onClick={onCancel}>
          {labels.cancel}
        </button>
        <button
          type="button"
          className="scanner-module__button is-primary"
          disabled={!valid}
          onClick={() => onApply(quad)}
        >
          {labels.apply}
        </button>
      </div>
    </div>
  )
}

// Pure geometry for the scanner: no DOM, no OpenCV, so it can be unit-tested in isolation.
// All coordinates are in pixels of the image they refer to, origin top-left, y pointing down.

export interface Point {
  x: number
  y: number
}

/** Four corners in the order top-left, top-right, bottom-right, bottom-left. */
export type Quad = [Point, Point, Point, Point]

export interface Size {
  width: number
  height: number
}

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y)
}

/**
 * Orders four points as top-left, top-right, bottom-right, bottom-left.
 *
 * Sorting by angle around the centroid keeps the result a simple (non-crossing) polygon even for a
 * page rotated close to 45 degrees, where the usual "smallest x+y is top-left" rule alone picks the
 * same point twice. The sum rule then only decides which corner the cycle starts at.
 */
export function orderCorners(points: readonly Point[]): Quad {
  if (points.length !== 4) {
    throw new Error(`orderCorners needs exactly 4 points, got ${points.length}`)
  }

  const cx = points.reduce((s, p) => s + p.x, 0) / 4
  const cy = points.reduce((s, p) => s + p.y, 0) / 4

  // Clockwise on screen (y down) is increasing atan2 angle.
  const clockwise = [...points].sort(
    (a, b) => Math.atan2(a.y - cy, a.x - cx) - Math.atan2(b.y - cy, b.x - cx)
  )

  let start = 0
  for (let i = 1; i < 4; i++) {
    if (clockwise[i].x + clockwise[i].y < clockwise[start].x + clockwise[start].y) start = i
  }

  return [0, 1, 2, 3].map((i) => ({ ...clockwise[(start + i) % 4] })) as Quad
}

/** Area by the shoelace formula; always positive. */
export function quadArea(quad: Quad): number {
  let sum = 0
  for (let i = 0; i < 4; i++) {
    const a = quad[i]
    const b = quad[(i + 1) % 4]
    sum += a.x * b.y - b.x * a.y
  }
  return Math.abs(sum) / 2
}

/** True when the quadrilateral is convex, i.e. every turn goes the same way. */
export function isConvex(quad: Quad): boolean {
  let sign = 0
  for (let i = 0; i < 4; i++) {
    const a = quad[i]
    const b = quad[(i + 1) % 4]
    const c = quad[(i + 2) % 4]
    const cross = (b.x - a.x) * (c.y - b.y) - (b.y - a.y) * (c.x - b.x)
    if (cross === 0) return false
    const s = Math.sign(cross)
    if (sign === 0) sign = s
    else if (s !== sign) return false
  }
  return true
}

/**
 * Size of the flattened page: the longer of each pair of opposite edges, so nothing is
 * squeezed, then scaled down so the long side is at most `maxLongSide`.
 */
export function outputSize(quad: Quad, maxLongSide: number): Size {
  const [tl, tr, br, bl] = quad
  const width = Math.max(distance(tl, tr), distance(bl, br))
  const height = Math.max(distance(tl, bl), distance(tr, br))
  return fitWithin({ width, height }, maxLongSide)
}

/** Scales a size down (never up) so its long side is at most `maxLongSide`; whole pixels, at least 1. */
export function fitWithin(size: Size, maxLongSide: number): Size {
  const long = Math.max(size.width, size.height)
  const scale = long > maxLongSide ? maxLongSide / long : 1
  return {
    width: Math.max(1, Math.round(size.width * scale)),
    height: Math.max(1, Math.round(size.height * scale)),
  }
}

/**
 * The starting quadrilateral when detection finds nothing usable: a rectangle slightly inside the
 * image borders, so every handle can be grabbed without touching the screen edge.
 */
export function fallbackQuad(size: Size, insetFraction = 0.05): Quad {
  const dx = size.width * insetFraction
  const dy = size.height * insetFraction
  return [
    { x: dx, y: dy },
    { x: size.width - dx, y: dy },
    { x: size.width - dx, y: size.height - dy },
    { x: dx, y: size.height - dy },
  ]
}

/** The whole image as a quadrilateral: "no crop". */
export function fullQuad(size: Size): Quad {
  return fallbackQuad(size, 0)
}

/**
 * True when every corner lies within `toleranceFraction` of an image corner: the "page" found is
 * the photo's own border. That happens on a photo without a visible page edge (a blank wall, or a
 * page filling the whole frame), so it is no detection at all.
 */
export function hugsImageBorder(quad: Quad, size: Size, toleranceFraction = 0.02): boolean {
  const tx = size.width * toleranceFraction
  const ty = size.height * toleranceFraction
  return fullQuad(size).every((corner, i) => {
    return Math.abs(quad[i].x - corner.x) <= tx && Math.abs(quad[i].y - corner.y) <= ty
  })
}

export function scaleQuad(quad: Quad, factor: number): Quad {
  return quad.map((p) => ({ x: p.x * factor, y: p.y * factor })) as Quad
}

export function clampPoint(p: Point, size: Size): Point {
  return {
    x: Math.min(Math.max(p.x, 0), size.width),
    y: Math.min(Math.max(p.y, 0), size.height),
  }
}

/** Index of the corner nearest to `p`, or -1 when none is within `maxDistance`. */
export function nearestCorner(quad: Quad, p: Point, maxDistance: number): number {
  let best = -1
  let bestDistance = maxDistance
  quad.forEach((corner, i) => {
    const d = distance(corner, p)
    if (d <= bestDistance) {
      best = i
      bestDistance = d
    }
  })
  return best
}

import { describe, expect, it } from 'vitest'
import {
  fallbackQuad,
  fitWithin,
  hugsImageBorder,
  isConvex,
  nearestCorner,
  orderCorners,
  outputSize,
  quadArea,
  type Point,
  type Quad,
} from './geometry'

const tl = { x: 10, y: 10 }
const tr = { x: 110, y: 12 }
const br = { x: 108, y: 210 }
const bl = { x: 8, y: 205 }

describe('orderCorners', () => {
  it('orders shuffled corners as tl, tr, br, bl', () => {
    const shuffles: Point[][] = [
      [br, tl, bl, tr],
      [bl, br, tr, tl],
      [tr, bl, tl, br],
    ]
    for (const points of shuffles) {
      expect(orderCorners(points)).toEqual([tl, tr, br, bl])
    }
  })

  it('keeps a page rotated by about 45 degrees a non-crossing polygon', () => {
    // A diamond: top, right, bottom, left.
    const top = { x: 100, y: 0 }
    const right = { x: 200, y: 101 }
    const bottom = { x: 99, y: 200 }
    const left = { x: 0, y: 100 }
    const quad = orderCorners([bottom, left, top, right])

    expect(isConvex(quad)).toBe(true)
    expect(new Set(quad.map((p) => `${p.x},${p.y}`)).size).toBe(4)
  })

  it('rejects anything but four points', () => {
    expect(() => orderCorners([tl, tr, br])).toThrow()
  })
})

describe('outputSize', () => {
  it('uses the longer of each pair of opposite edges', () => {
    const quad: Quad = [
      { x: 0, y: 0 },
      { x: 100, y: 0 },
      { x: 120, y: 300 },
      { x: -20, y: 300 },
    ]
    // Bottom edge 140 is longer than the top edge 100.
    expect(outputSize(quad, 10_000)).toEqual({ width: 140, height: Math.round(Math.hypot(20, 300)) })
  })

  it('caps the long side and keeps the aspect ratio', () => {
    const quad = fallbackQuad({ width: 2100, height: 2970 }, 0)
    expect(outputSize(quad, 2400)).toEqual({ width: 1697, height: 2400 })
  })
})

describe('fitWithin', () => {
  it('never scales up', () => {
    expect(fitWithin({ width: 300, height: 200 }, 4000)).toEqual({ width: 300, height: 200 })
  })

  it('caps at the long side whichever orientation', () => {
    expect(fitWithin({ width: 6000, height: 4000 }, 4000)).toEqual({ width: 4000, height: 2667 })
    expect(fitWithin({ width: 4000, height: 6000 }, 4000)).toEqual({ width: 2667, height: 4000 })
  })
})

describe('fallbackQuad', () => {
  it('sits inside the image borders', () => {
    const quad = fallbackQuad({ width: 1000, height: 2000 })
    expect(quad).toEqual([
      { x: 50, y: 100 },
      { x: 950, y: 100 },
      { x: 950, y: 1900 },
      { x: 50, y: 1900 },
    ])
    expect(isConvex(quad)).toBe(true)
  })
})

describe('quadArea and isConvex', () => {
  it('computes the area of a rectangle', () => {
    expect(quadArea(fallbackQuad({ width: 40, height: 30 }, 0))).toBe(1200)
  })

  it('detects a crossed (bow-tie) quadrilateral', () => {
    expect(isConvex([tl, br, tr, bl])).toBe(false)
  })
})

describe('hugsImageBorder', () => {
  const size = { width: 500, height: 400 }

  it('recognises the image border found on a photo without a page edge', () => {
    const border: Quad = [
      { x: 1, y: 0 },
      { x: 499, y: 2 },
      { x: 500, y: 398 },
      { x: 0, y: 400 },
    ]
    expect(hugsImageBorder(border, size)).toBe(true)
  })

  it('does not reject a page that is merely large', () => {
    expect(hugsImageBorder(fallbackQuad(size, 0.05), size)).toBe(false)
  })
})

describe('nearestCorner', () => {
  it('finds the corner within reach, or none', () => {
    const quad: Quad = [tl, tr, br, bl]
    expect(nearestCorner(quad, { x: 105, y: 15 }, 20)).toBe(1)
    expect(nearestCorner(quad, { x: 60, y: 100 }, 20)).toBe(-1)
  })
})

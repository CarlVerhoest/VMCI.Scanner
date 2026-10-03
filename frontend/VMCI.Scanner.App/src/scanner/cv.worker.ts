// The OpenCV.js worker: corner detection and perspective warp, off the main thread.
//
// OpenCV.js is about 10 MB. Importing it here, in a worker that is created only when the scanner
// opens, keeps it out of the main bundle; the PWA config excludes this chunk from the precache and
// caches it at runtime instead (vite.config.ts).

import cvModule from '@techstark/opencv-js'
import { isConvex, orderCorners, quadArea, type Point, type Quad } from './geometry'
import type { WorkerRequest, WorkerResponse } from './workerProtocol'

// The package's typings describe the API but not the module shape it is loaded as.
type CV = typeof import('@techstark/opencv-js')
type Mat = InstanceType<CV['Mat']>

const scope = self as unknown as {
  postMessage(message: WorkerResponse, transfer?: Transferable[]): void
  onmessage: ((event: MessageEvent<WorkerRequest>) => void) | null
}

// Depending on the build, the module is a promise of the runtime, or the Emscripten runtime object
// itself. 4.12 is the latter, and a "thenable" at that: resolving a promise WITH it (returning it
// from an async function, awaiting it) adopts its then(), which resolves to itself again - forever.
// So the runtime only ever travels wrapped in an object. Readiness is detected by
// onRuntimeInitialized or by polling for cv.Mat, whichever comes first.
async function loadOpenCv(): Promise<{ cv: CV }> {
  const raw = cvModule as unknown
  if (raw instanceof Promise) return { cv: (await raw) as CV }

  const module = raw as CV & { onRuntimeInitialized?: () => void; Mat?: unknown }
  const isReady = () => typeof module.Mat === 'function'
  if (isReady()) return { cv: module }

  await new Promise<void>((resolve) => {
    const timer = setInterval(() => {
      if (isReady()) done()
    }, 50)
    const previous = module.onRuntimeInitialized
    function done() {
      clearInterval(timer)
      resolve()
    }
    module.onRuntimeInitialized = () => {
      previous?.()
      done()
    }
  })
  return { cv: module }
}

const cvReady = loadOpenCv()
let loadedCv: CV | null = null

cvReady.then(
  ({ cv }) => {
    loadedCv = cv
    scope.postMessage({ type: 'ready' })
  },
  (error: unknown) => scope.postMessage({ type: 'error', id: -1, message: String(error) })
)

scope.onmessage = async (event) => {
  const request = event.data
  try {
    const { cv } = await cvReady
    if (request.type === 'detect') {
      const quad = detect(cv, request.image)
      scope.postMessage({ type: 'detected', id: request.id, quad })
    } else if (request.type === 'warp') {
      const image = warp(cv, request.image, request.quad, request.width, request.height)
      scope.postMessage({ type: 'warped', id: request.id, image }, [image.data.buffer])
    }
  } catch (error) {
    scope.postMessage({ type: 'error', id: request.id, message: describeError(loadedCv, error) })
  }
}

// OpenCV throws numeric exception pointers rather than Error objects.
function describeError(cv: CV | null, error: unknown): string {
  if (typeof error === 'number' && cv) {
    try {
      return (cv as unknown as { exceptionFromPtr(p: number): { msg: string } }).exceptionFromPtr(error).msg
    } catch {
      return `OpenCV exception ${error}`
    }
  }
  return error instanceof Error ? error.message : String(error)
}

/**
 * Finds the page in a small (about 500 px) copy of the photo.
 *
 * Several passes, cheapest and strictest first, because one fixed set of thresholds misses white
 * paper on a light table. Each pass looks for the largest contour that reduces to a convex
 * quadrilateral covering at least MIN_AREA_FRACTION of the image. Returns null when none does;
 * the caller then starts from a rectangle inside the borders and the user drags the corners.
 */
const MIN_AREA_FRACTION = 0.2

function detect(cv: CV, image: ImageData): Quad | null {
  const minArea = image.width * image.height * MIN_AREA_FRACTION
  const mats: Mat[] = []
  const track = <T extends Mat>(m: T): T => {
    mats.push(m)
    return m
  }

  try {
    const src = track(cv.matFromImageData(image))
    const gray = track(new cv.Mat())
    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY)
    const blurred = track(new cv.Mat())
    cv.GaussianBlur(gray, blurred, new cv.Size(5, 5), 0)

    const kernel = track(cv.getStructuringElement(cv.MORPH_RECT, new cv.Size(3, 3)))

    const edgeMaps: Array<() => Mat> = [
      // 1. Classic Canny: dark table, clear page edge.
      () => {
        const edges = track(new cv.Mat())
        cv.Canny(blurred, edges, 75, 200)
        cv.dilate(edges, edges, kernel)
        return edges
      },
      // 2. Lower thresholds and a closing: faint edges, white paper on a light surface.
      () => {
        const edges = track(new cv.Mat())
        cv.Canny(blurred, edges, 20, 60)
        cv.morphologyEx(edges, edges, cv.MORPH_CLOSE, kernel, new cv.Point(-1, -1), 2)
        return edges
      },
      // 3. Otsu threshold: a page that differs from the background in brightness, not by an edge.
      () => {
        const bin = track(new cv.Mat())
        cv.threshold(blurred, bin, 0, 255, cv.THRESH_BINARY + cv.THRESH_OTSU)
        return bin
      },
    ]

    for (const makeEdges of edgeMaps) {
      const quad = largestQuad(cv, makeEdges(), minArea, track)
      if (quad) return quad
    }
    return null
  } finally {
    for (const m of mats) m.delete()
  }
}

function largestQuad(
  cv: CV,
  edges: Mat,
  minArea: number,
  track: <T extends Mat>(m: T) => T
): Quad | null {
  const contours = new cv.MatVector()
  const hierarchy = track(new cv.Mat())
  try {
    cv.findContours(edges, contours, hierarchy, cv.RETR_LIST, cv.CHAIN_APPROX_SIMPLE)

    const candidates: Array<{ index: number; area: number }> = []
    for (let i = 0; i < contours.size(); i++) {
      const area = cv.contourArea(contours.get(i))
      if (area >= minArea) candidates.push({ index: i, area })
    }
    candidates.sort((a, b) => b.area - a.area)

    for (const { index } of candidates.slice(0, 5)) {
      const contour = contours.get(index)
      // The hull smooths away bites taken out of the outline by fingers or a shadow.
      const hull = track(new cv.Mat())
      cv.convexHull(contour, hull)
      const perimeter = cv.arcLength(hull, true)

      // Loosen the approximation step by step until the outline is a quadrilateral.
      for (const epsilon of [0.02, 0.04, 0.06, 0.08, 0.1]) {
        const approx = track(new cv.Mat())
        cv.approxPolyDP(hull, approx, epsilon * perimeter, true)
        if (approx.rows === 4) {
          const points: Point[] = []
          for (let r = 0; r < 4; r++) {
            points.push({ x: approx.data32S[r * 2], y: approx.data32S[r * 2 + 1] })
          }
          const quad = orderCorners(points)
          if (isConvex(quad) && quadArea(quad) >= minArea) return quad
          break
        }
        if (approx.rows < 4) break
      }
    }
    return null
  } finally {
    contours.delete()
  }
}

/** Flattens the quadrilateral onto a width x height rectangle at full resolution. */
function warp(cv: CV, image: ImageData, quad: Quad, width: number, height: number): ImageData {
  const src = cv.matFromImageData(image)
  const dst = new cv.Mat()
  const from = cv.matFromArray(4, 1, cv.CV_32FC2, quad.flatMap((p) => [p.x, p.y]))
  const to = cv.matFromArray(4, 1, cv.CV_32FC2, [0, 0, width, 0, width, height, 0, height])
  const matrix = cv.getPerspectiveTransform(from, to)
  try {
    cv.warpPerspective(
      src,
      dst,
      matrix,
      new cv.Size(width, height),
      cv.INTER_LINEAR,
      cv.BORDER_REPLICATE,
      new cv.Scalar()
    )
    return new ImageData(new Uint8ClampedArray(dst.data), width, height)
  } finally {
    src.delete()
    dst.delete()
    from.delete()
    to.delete()
    matrix.delete()
  }
}

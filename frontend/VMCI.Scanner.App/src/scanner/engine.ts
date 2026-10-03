// Main-thread side of the OpenCV worker, plus the page pipeline built on it.

import {
  fallbackQuad,
  fullQuad,
  hugsImageBorder,
  outputSize,
  scaleQuad,
  type Quad,
  type Size,
} from './geometry'
import {
  DETECT_LONG_SIDE,
  MAX_OUTPUT_LONG_SIDE,
  canvasFromImageData,
  downscale,
  imageDataOf,
  rotate,
  toJpeg,
} from './imaging'
import type { WorkerRequest, WorkerResponse } from './workerProtocol'

type Pending = { resolve: (value: WorkerResponse) => void; reject: (error: Error) => void }

// Distributes the Omit over the union, so each request keeps its own fields.
type RequestWithoutId = WorkerRequest extends infer R
  ? R extends WorkerRequest
    ? Omit<R, 'id'>
    : never
  : never

export class ScannerEngine {
  private readonly worker: Worker
  private readonly pending = new Map<number, Pending>()
  private nextId = 1
  /** Resolves once OpenCV has loaded in the worker; the first time this downloads ~10 MB. */
  readonly ready: Promise<void>

  constructor() {
    this.worker = new Worker(new URL('./cv.worker.ts', import.meta.url), { type: 'module' })

    let markReady: () => void = () => undefined
    let markFailed: (error: Error) => void = () => undefined
    this.ready = new Promise<void>((resolve, reject) => {
      markReady = resolve
      markFailed = reject
    })

    this.worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
      const message = event.data
      if (message.type === 'ready') {
        markReady()
        return
      }
      if (message.type === 'error' && message.id === -1) {
        markFailed(new Error(message.message))
        return
      }
      const waiter = this.pending.get(message.id)
      if (!waiter) return
      this.pending.delete(message.id)
      if (message.type === 'error') waiter.reject(new Error(message.message))
      else waiter.resolve(message)
    }

    this.worker.onerror = (event) => {
      const error = new Error(event.message || 'Scanner worker failed')
      markFailed(error)
      for (const waiter of this.pending.values()) waiter.reject(error)
      this.pending.clear()
    }
  }

  dispose(): void {
    this.worker.terminate()
    for (const waiter of this.pending.values()) waiter.reject(new Error('Scanner closed'))
    this.pending.clear()
  }

  private call(request: RequestWithoutId, transfer: Transferable[]): Promise<WorkerResponse> {
    const id = this.nextId++
    return new Promise((resolve, reject) => {
      this.pending.set(id, { resolve, reject })
      this.worker.postMessage({ ...request, id }, transfer)
    })
  }

  async detect(image: ImageData): Promise<Quad | null> {
    const response = await this.call({ type: 'detect', image }, [image.data.buffer])
    return response.type === 'detected' ? response.quad : null
  }

  async warp(image: ImageData, quad: Quad, size: Size): Promise<ImageData> {
    const response = await this.call(
      { type: 'warp', image, quad, width: size.width, height: size.height },
      [image.data.buffer]
    )
    if (response.type !== 'warped') throw new Error('Unexpected worker response')
    return response.image
  }

  /**
   * Finds the page corners in a decoded source image. `detected` is false when nothing usable
   * was found and the quad is the fallback rectangle the user has to adjust.
   */
  async findCorners(source: HTMLCanvasElement): Promise<{ quad: Quad; detected: boolean }> {
    const size = { width: source.width, height: source.height }
    const small = downscale(source, DETECT_LONG_SIDE)
    const quad = await this.detect(imageDataOf(small))
    if (quad && hugsImageBorder(quad, { width: small.width, height: small.height })) {
      // The photo's own edge, not a page: keep the whole photo, but have the user look at it.
      return { quad: fullQuad(size), detected: false }
    }
    if (quad) return { quad: scaleQuad(quad, source.width / small.width), detected: true }
    return { quad: fallbackQuad(size), detected: false }
  }

  /** Flattens, rotates and encodes one page. */
  async render(
    source: HTMLCanvasElement,
    quad: Quad,
    quarterTurns: number
  ): Promise<{ blob: Blob; width: number; height: number }> {
    const size = outputSize(quad, MAX_OUTPUT_LONG_SIDE)
    const flat = canvasFromImageData(await this.warp(imageDataOf(source), quad, size))
    const turned = rotate(flat, quarterTurns)
    return { blob: await toJpeg(turned), width: turned.width, height: turned.height }
  }
}

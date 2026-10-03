// Canvas helpers on the main thread: decoding a photo, scaling, rotating and encoding JPEG.

import { fitWithin, type Size } from './geometry'

/** Working images are capped here: iOS Safari refuses canvases above roughly 16.7 megapixels. */
export const MAX_SOURCE_LONG_SIDE = 4000
/** Detection runs on a small copy; edges are clearer and it is fast. */
export const DETECT_LONG_SIDE = 500
/** About 200 DPI for A4: enough for OCR, small enough to mail. */
export const MAX_OUTPUT_LONG_SIDE = 2400
export const JPEG_QUALITY = 0.8

export function createCanvas(size: Size): HTMLCanvasElement {
  const canvas = document.createElement('canvas')
  canvas.width = size.width
  canvas.height = size.height
  return canvas
}

function context2d(canvas: HTMLCanvasElement): CanvasRenderingContext2D {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  if (!ctx) throw new Error('Canvas 2D context unavailable')
  return ctx
}

/**
 * Decodes a photo with its EXIF orientation applied, capped at MAX_SOURCE_LONG_SIDE.
 *
 * Decoding is deterministic, so corner coordinates stored against the result stay valid when the
 * same file is decoded again later (for re-editing the corners); that is why pages keep the
 * original file rather than a decoded bitmap, which on a phone would cost ~50 MB per page.
 */
export async function decodeImage(file: Blob): Promise<HTMLCanvasElement> {
  const source = await loadBitmap(file)
  try {
    const size = fitWithin({ width: source.width, height: source.height }, MAX_SOURCE_LONG_SIDE)
    const canvas = createCanvas(size)
    const ctx = context2d(canvas)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(source, 0, 0, size.width, size.height)
    return canvas
  } finally {
    if ('close' in source) source.close()
  }
}

async function loadBitmap(file: Blob): Promise<ImageBitmap | HTMLImageElement> {
  try {
    return await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    // Older Safari rejects the options bag; an <img> applies EXIF orientation by default.
    const url = URL.createObjectURL(file)
    try {
      const img = new Image()
      img.src = url
      await img.decode()
      return img
    } finally {
      URL.revokeObjectURL(url)
    }
  }
}

export function imageDataOf(canvas: HTMLCanvasElement): ImageData {
  return context2d(canvas).getImageData(0, 0, canvas.width, canvas.height)
}

/** A scaled-down copy whose long side is at most `longSide`. */
export function downscale(canvas: HTMLCanvasElement, longSide: number): HTMLCanvasElement {
  const size = fitWithin({ width: canvas.width, height: canvas.height }, longSide)
  const small = createCanvas(size)
  const ctx = context2d(small)
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(canvas, 0, 0, size.width, size.height)
  return small
}

export function canvasFromImageData(image: ImageData): HTMLCanvasElement {
  const canvas = createCanvas({ width: image.width, height: image.height })
  context2d(canvas).putImageData(image, 0, 0)
  return canvas
}

/** Rotates clockwise by `quarterTurns` x 90 degrees. */
export function rotate(canvas: HTMLCanvasElement, quarterTurns: number): HTMLCanvasElement {
  const turns = ((quarterTurns % 4) + 4) % 4
  if (turns === 0) return canvas

  const swap = turns % 2 === 1
  const out = createCanvas(
    swap
      ? { width: canvas.height, height: canvas.width }
      : { width: canvas.width, height: canvas.height }
  )
  const ctx = context2d(out)
  ctx.translate(out.width / 2, out.height / 2)
  ctx.rotate((turns * Math.PI) / 2)
  ctx.drawImage(canvas, -canvas.width / 2, -canvas.height / 2)
  return out
}

export function toJpeg(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('JPEG encoding failed'))),
      'image/jpeg',
      JPEG_QUALITY
    )
  })
}

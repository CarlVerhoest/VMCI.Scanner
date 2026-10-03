import type { Quad } from './geometry'

export type WorkerRequest =
  | { type: 'detect'; id: number; image: ImageData }
  | { type: 'warp'; id: number; image: ImageData; quad: Quad; width: number; height: number }

export type WorkerResponse =
  | { type: 'ready' }
  | { type: 'detected'; id: number; quad: Quad | null }
  | { type: 'warped'; id: number; image: ImageData }
  | { type: 'error'; id: number; message: string }

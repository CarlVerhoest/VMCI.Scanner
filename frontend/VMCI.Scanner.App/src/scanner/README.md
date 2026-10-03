# Scanner module

Turns photos of paper documents into flat, cropped page images, in the browser. It is built to be
lifted into another React app (the VMCI application) unchanged, so it follows strict rules:

- **One public entry point**: `index.ts`. Import nothing else from this folder.
- **No imports from outside this folder** except `react` and `@techstark/opencv-js`. ESLint
  enforces this (`no-restricted-imports` in `eslint.config.js`).
- **No backend calls.** The output is a list of page images; what happens next (upload, OCR,
  email) is the host's business.
- **No UI framework.** Plain React and plain CSS (`scanner.css`).
- **No hard-coded text.** Every string comes from `labels`; the Dutch defaults are in `labels.ts`.

## Public API

```tsx
import { DocumentScanner, type ScannedPage } from './scanner'

<DocumentScanner
  onComplete={(pages: ScannedPage[]) => upload(pages)}
  onCancel={() => navigate(-1)}
  maxPages={20}
  labels={{ done: 'Pdf maken' }} // any subset of ScannerLabels
/>

interface ScannedPage {
  blob: Blob // JPEG, perspective-corrected, long side at most 2400 px
  width: number
  height: number
}
```

The scanner keeps its pages while it stays mounted. A host that wants a "back to the scanner"
button after `onComplete` should hide the component rather than unmount it.

## Embedding in another app

1. Copy this folder.
2. `npm install @techstark/opencv-js@4.12.0-release.1` (pinned; the 5.x line is new).
3. If the host is a PWA built with `vite-plugin-pwa`, keep the ~10 MB worker chunk out of the
   precache and cache it at runtime instead — see `vite.config.ts` in this app (`globIgnores` for
   `**/cv.worker-*.js`, a `runtimeCaching` rule for the same pattern, and `worker.format: 'es'`).
4. Colours: the CSS reads the host's `--scanner-accent`, `--scanner-surface`, `--scanner-text`,
   `--scanner-text-muted`, `--scanner-danger` (and a few more, see `scanner.css`), each with a
   fallback. Define them in the host theme to restyle the module.

## How it works

| Step | Where | File |
|---|---|---|
| Decode with EXIF rotation, cap at 4000 px (iOS canvas limit) | main thread | `imaging.ts` |
| Detect corners on a ~500 px copy: Canny, then low-threshold Canny, then Otsu; largest convex quadrilateral covering ≥ 20% | worker | `cv.worker.ts` |
| No usable contour: rectangle 5% inside the borders, flagged "Controleer de hoeken" | main thread | `geometry.ts` |
| Corner editor with magnifier | main thread | `CornerEditor.tsx` |
| Warp at full resolution to the quadrilateral's edge lengths, long side ≤ 2400 px | worker | `cv.worker.ts` |
| Rotate by quarter turns, encode JPEG 0.8 | main thread | `imaging.ts` |

A page keeps its original photo, not the decoded image, so re-editing corners costs a decode but
twenty pages do not hold a gigabyte of bitmaps on a phone.

## Tests

`geometry.test.ts` (Vitest) covers the pure geometry: corner ordering, output size, the fallback
rectangle, convexity. Run `npm test` in the app folder. Detection quality is verified by hand on
real phones (see `docs/scan-app-plan.md`, section 11).

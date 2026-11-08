// Handing a file the app holds in memory to the user: the system share sheet (Web Share API
// level 2) where the browser can share files, otherwise a download.

/** A `File` with this name: the given one when it already matches, else a copy of the data. */
export function toFile(data: Blob, fileName: string): File {
  if (data instanceof File && data.name === fileName) return data
  return new File([data], fileName, { type: data.type })
}

/**
 * Whether this browser can share the file through the system share sheet. Needs the Web Share
 * API level 2 (`navigator.canShare({ files })`); desktop Firefox, for one, lacks it.
 */
export function canShareFile(file: File): boolean {
  if (typeof navigator === 'undefined' || typeof navigator.canShare !== 'function') return false
  try {
    return navigator.canShare({ files: [file] })
  } catch {
    return false
  }
}

/**
 * Opens the system share sheet for the file. Call it straight from the user's tap or click:
 * browsers refuse `share()` without a user gesture, so do not await anything before it.
 * Resolves `'cancelled'` when the user closes the sheet (an `AbortError`, not a failure);
 * rejects on any other error.
 */
export async function shareFile(file: File, title = file.name): Promise<'shared' | 'cancelled'> {
  try {
    await navigator.share({ files: [file], title })
    return 'shared'
  } catch (error) {
    // Checked by name: a DOMException is not an Error in every environment.
    if ((error as { name?: unknown } | null)?.name === 'AbortError') return 'cancelled'
    throw error
  }
}

/** Saves the data as a download through a temporary object URL. */
export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Revoked on the next tick: revoking synchronously can cancel the download in some browsers
  // before it has read the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

/**
 * The file name the server chose, from a Content-Disposition header. Prefers RFC 5987's
 * `filename*` (percent-encoded UTF-8) over the plain `filename`; null when there is none.
 */
export function fileNameFromContentDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (encoded?.[1]) {
    try {
      return decodeURIComponent(encoded[1])
    } catch {
      // Malformed encoding: fall back to the plain form rather than fail the download.
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain?.[1] ?? null
}

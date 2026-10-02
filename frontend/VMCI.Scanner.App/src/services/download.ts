// Handing a file the API returned to the browser as a download.
//
// Every archived document (the project's Dimona list, an employee's C4, ...) is fetched through
// axios rather than a plain <a href>, because the endpoints need the JWT the interceptor attaches -
// a link would arrive unauthenticated and 401. That means the response lands in memory as a Blob
// and has to be handed over via a temporary object URL, which is what these two do.
//
// Shared between projectService and employeeService: two copies of a file-name parser is how the
// project's downloads and the employee's start naming files differently.

// Reads the server's chosen file name out of Content-Disposition. Prefers RFC 5987's `filename*`
// (percent-encoded UTF-8) over the plain `filename`, since the stored names carry surnames.
export function fileNameFromContentDisposition(header: unknown): string | null {
  if (typeof header !== 'string') return null

  const encoded = /filename\*=UTF-8''([^;]+)/i.exec(header)
  if (encoded) {
    try {
      return decodeURIComponent(encoded[1])
    } catch {
      // Malformed encoding — fall through to the plain form rather than failing the download.
    }
  }

  const plain = /filename="?([^";]+)"?/i.exec(header)
  return plain ? plain[1] : null
}

export function downloadBlob(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()
  // Released on the next tick: revoking synchronously can cancel the download in some browsers
  // before it has read the blob.
  setTimeout(() => URL.revokeObjectURL(url), 0)
}

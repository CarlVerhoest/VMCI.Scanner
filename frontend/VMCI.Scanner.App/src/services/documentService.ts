import axiosInstance from './axiosConfig'
import { fileNameFromContentDisposition } from './download'
import type { ScannedPage } from '../scanner'

// Matches VMCI.Scanner.WebApi's DocumentCapabilitiesDto.
export interface DocumentCapabilities {
  searchablePdf: boolean
  email: boolean
  maxPages: number
}

export interface CreatedPdf {
  blob: Blob
  fileName: string
  // False when OCR was not configured or failed: the PDF is images only, its text not searchable.
  searchable: boolean
}

// FormData must not go out as JSON: naming the multipart type lets axios and the browser add the
// boundary themselves.
const multipart = { headers: { 'Content-Type': 'multipart/form-data' } }

export const documentService = {
  async getCapabilities(): Promise<DocumentCapabilities> {
    const { data } = await axiosInstance.get<DocumentCapabilities>('/documents/capabilities')
    return data
  },

  async createPdf(pages: ScannedPage[], fileName: string): Promise<CreatedPdf> {
    const form = new FormData()
    pages.forEach((page, i) => form.append('pages', page.blob, `pagina-${i + 1}.jpg`))
    form.append('fileName', fileName)

    const response = await axiosInstance.post<Blob>('/documents/pdf', form, {
      ...multipart,
      responseType: 'blob',
      // Several megabytes up and OCR at Azure: give it time on a slow phone connection.
      timeout: 180_000,
    })

    return {
      blob: response.data,
      fileName: fileNameFromContentDisposition(response.headers['content-disposition']) ?? `${fileName}.pdf`,
      searchable: response.headers['x-searchable'] === 'true',
    }
  },

  async email(pdf: Blob, recipient: string, fileName: string): Promise<void> {
    const form = new FormData()
    form.append('file', pdf, fileName)
    form.append('recipient', recipient)
    form.append('fileName', fileName)
    await axiosInstance.post('/documents/email', form, { ...multipart, timeout: 120_000 })
  },
}

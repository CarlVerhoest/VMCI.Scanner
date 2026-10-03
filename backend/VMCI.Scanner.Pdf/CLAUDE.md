# VMCI.Scanner.Pdf

Turns page images into a PDF, searchable when OCR is configured. No database, no HTTP.

## Contains

- `ImagePdfBuilder` — one page per JPEG/PNG, page size from the image's aspect ratio (long side
  A4). PDFsharp 6; JPEG is embedded without re-encoding. `DetectFormat` checks the magic bytes —
  never trust a file name or content type from the client.
- `IOcrProvider` and `AzureDocumentIntelligenceOcrProvider` — model `prebuilt-read` with PDF output.
  The analysis result is deleted in Azure right after it is fetched.
- `SearchablePdfService` — image PDF first, OCR on top. **OCR failing or missing is never an
  error**: the image PDF comes back with `IsSearchable = false` and the client shows a warning.

## Configuration

Section `DocumentIntelligence`: `Endpoint` (committed is fine, it is not a secret), `Key` (secret —
`backend/secrets/appsettings.secrets.json` or `DocumentIntelligence__Key`), `ModelId`. The OCR
provider is registered in `Program.cs` only when `Endpoint` and `Key` are both set; otherwise the
startup log says `Document Intelligence skipped: not configured` and PDFs are image-only.

## Does NOT contain

- Controllers, request validation (page count, sizes) — that is `DocumentsController` in WebApi.
- Email. When a mail service is chosen it gets its own project.

## Unverified

- Whether the Azure free tier (F0) processes only the first two pages. Assume tier S0.
- The searchable PDF's size compared to the image PDF; it is logged on every OCR so it can be
  checked against the mail size limit once email exists.

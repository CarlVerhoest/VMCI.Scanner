# VMCI.Scanner.Claude

Proposes a name for a scanned document from the text OCR read, through the Anthropic API. No
database, no HTTP endpoints.

## Contains

- `ClaudeOptions` — section `Anthropic`: `ApiKey` (secret), `TitleModel`, `TitleTimeoutSeconds`.
- `IDocumentTitleSuggester` and `AnthropicDocumentTitleSuggester` — one structured-output request
  (official `Anthropic` SDK, beta endpoint for the server-side refusal fallback), effort `low`.
  Claude returns facts (`DocumentFacts`), not a finished name.
- `DocumentTitle.Compose` — turns the facts into the name, so the format is code and tested:
  - an invoice (also a credit note, receipt or till ticket): `company-nature-yyyyMMdd`, for example
    `Garage Peeters BV-Onderhoud-20260914`. Nature is at most two Dutch words. Without a readable
    invoice date: `company-nature`.
  - any other document: a free Dutch title.
  - nothing usable: no suggestion.

## Rules

- **Never a condition for the PDF.** No OCR text, no key, a failure, a refusal or a timeout
  (`TitleTimeoutSeconds`) all mean "no suggestion"; `DocumentsController` sends the PDF regardless.
- **The company name is never shortened** — not by the prompt, not by `Compose`. It is the
  company's own name: a branch, shop or station is left out (`TotalEnergies`, not `TotalEnergies
  Station Gent Ring Oost`; the user's decision, 05/10/2026), and all-capitals becomes the usual
  spelling.
- **Document content is never logged**: only whether it was an invoice and the token counts.
- **Scanner's own API key**, not one shared with another application, so the cost is visible per
  application in the Anthropic Console and the key can be revoked on its own.
- The suggested name (Dutch content) is staff-facing UI copy; the prompt and the field names are
  English.

## Does NOT contain

- OCR: that is `VMCI.Scanner.Pdf`, which also hands over the recognised text.
- The choice whether to apply the suggestion: the client applies it only while the user has not
  typed a name of their own.

## Trying it on a document

```powershell
dotnet run --project backend/VMCI.Scanner.DevTools -- suggest-title <scan.jpg> [<more files> ...]
```

Runs the same Azure OCR and the same suggester as the API, with the secrets file's keys, and prints
only the proposed name and timings — never the document's text.

## Tested

05/10/2026, `claude-opus-5-5`, on five fabricated documents (OCR 3 s, Claude 2–8 s each), all right:
a telecom invoice with VMCI printed at the top as customer and the supplier only in the footer
(supplier and invoice date, not due date, were picked), a fuel till ticket, a restaurant bill, an
invoice from a supplier with a very long name (kept in full), and meeting minutes (free title).

## Unverified

- Real scans: photographed, skewed or faded invoices. Check a handful before relying on it.
- The nature is chosen per document, so the same kind of invoice can get different words
  (`Dakwerken` in one run, `Herstellingswerken` in the next).

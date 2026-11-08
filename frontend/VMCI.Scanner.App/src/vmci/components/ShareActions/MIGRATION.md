# Migratie naar `ShareActions`

## Vervangt

| Project | Oud pad | Oude naam | Bronversie (commit) |
| ------- | ------- | --------- | ------------------- |
| VMCI.Scanner | `frontend/VMCI.Scanner.App/src/pages/Scan.tsx` | knoppen Delen/Downloaden (`canShare`, `share`) | `4400de4` |
| VMCI.Scanner | `frontend/VMCI.Scanner.App/src/services/download.ts` | `downloadBlob`, `fileNameFromContentDisposition` | `4400de4` |

## Gebruik vinden

```text
regex: navigator\.(canShare|share)\b
regex: \b(downloadBlob|fileNameFromContentDisposition)\b
regex: from\s+['"].*services/download['"]
```

## Import

```tsx
// oud
import { downloadBlob, fileNameFromContentDisposition } from '../services/download'
// nieuw
import { ShareActions, downloadBlob, fileNameFromContentDisposition } from '@vmci/ui'
```

## Prop-mapping

| Oud (Scanner) | Nieuw | Omzetting / opmerking |
| ------------- | ----- | --------------------- |
| `new File([pdf.blob], fileName, { type: 'application/pdf' })` | `file={pdf?.blob ?? null}` + `fileName={fileName}` | De component maakt zelf de `File` met die naam (`toFile`). Een `File` met dezelfde naam wordt ongewijzigd gebruikt. |
| `canShare = navigator.canShare?.({ files: [pdfFile] })` | ingebouwd; los: `canShareFile(file)` | Zonder deelbaar bestand toont de component alleen Downloaden, als primaire knop, zoals vroeger. |
| `navigator.share({ files: [pdfFile], title: fileName })` | ingebouwd; los: `shareFile(file, title?)` | De titel is standaard `fileName`; ander via `shareTitle`. |
| `AbortError` → geen fout | idem | `shareFile` geeft dan `'cancelled'`; `onError` wordt niet aangeroepen. |
| `setError('Delen is mislukt. Gebruik Downloaden.')` | `onError={() => setError('Delen is mislukt. Gebruik Downloaden.')}` | **De component toont zelf geen melding.** De app kiest de tekst en waar ze komt. `onError` krijgt de oorspronkelijke fout. |
| `onClick={() => downloadBlob(pdf.blob, fileName)}` | ingebouwd (knop Downloaden) | `onDownloaded` meldt dat de download gestart is; een fout gaat naar `onError`. |
| `btn btn-primary btn-lg` / `btn-outline-primary btn-lg` | `size="lg"` | Zonder `size` zijn het normale knoppen. |
| `d-flex flex-wrap gap-2 mb-4` (wrapper) | ingebouwd `d-flex`/wrap/gap; `className="mb-4"` | De marge eronder geef je mee via `className`. |
| Teksten "Delen" / "Downloaden" | labels `share` / `download` | Overschrijfbaar via `labels` of `VMCIProvider`. |
| `downloadBlob(blob, fileName)` (service) | `downloadBlob(blob, fileName)` | Ongewijzigd. |
| `fileNameFromContentDisposition(header)` (service) | idem | Ongewijzigd. |

## Gedragswijzigingen

- Terwijl het deelvenster open is, staat Delen uit: een tweede tik zou een fout geven (`InvalidStateError`).
- Nieuw: `isBusy` (beide knoppen uit, met spinner, `aria-busy`), `disabled`, en `file={null}` (nog geen bestand: knoppen uit).
- Nieuw: `onShared` na een geslaagde deelactie.
- Op touch zijn de knoppen minstens 44 px hoog.

## Functionaliteit behouden

| Oud gebruik | Hoe nu |
| ----------- | ------ |
| Een PDF uit de API downloaden zonder knoppen (andere pagina's) | `downloadBlob(blob, fileName)` uit `@vmci/ui`, zoals vroeger. |
| Eigen knop die deelt | `shareFile(toFile(blob, name))` rechtstreeks in de `onClick`, zonder `await` ervoor. |
| Melding bij mislukt delen | `onError` met de eigen Nederlandse tekst. |

## Styling

- Geen eigen CSS nodig. Kleuren via de Bootstrap-variant `primary`, dus via de tokens van de app.

## Voorbeeld

```tsx
// oud
<div className="d-flex flex-wrap gap-2 mb-4">
  {canShare && (
    <button type="button" className="btn btn-primary btn-lg" onClick={() => void share()}>
      <FontAwesomeIcon icon={faShareNodes} className="me-2" />
      Delen
    </button>
  )}
  <button
    type="button"
    className={canShare ? 'btn btn-outline-primary btn-lg' : 'btn btn-primary btn-lg'}
    onClick={() => downloadBlob(pdf.blob, fileName)}
  >
    <FontAwesomeIcon icon={faDownload} className="me-2" />
    Downloaden
  </button>
</div>

// nieuw
<ShareActions
  className="mb-4"
  size="lg"
  file={pdf.blob}
  fileName={fileName}
  onError={() => setError('Delen is mislukt. Gebruik Downloaden.')}
/>
```

## Controlelijst

- [ ] De knoppen in `Scan.tsx` zijn vervangen; `canShare`, `share` en `pdfFile` zijn weg als ze nergens anders gebruikt worden
- [ ] `services/download.ts` is vervangen door de imports uit `@vmci/ui` en verwijderd (zoekpatronen: 0 resultaten)
- [ ] De foutmelding bij mislukt delen komt nog altijd (via `onError`)
- [ ] Getest op een telefoon (Delen + Downloaden) en in desktop Firefox (alleen Downloaden)
- [ ] Typecheck, build en tests van de app slagen

# Scan App — Project Plan and Start Instructions

This document is the starting brief for a new, standalone project. It describes what to build, the decisions already taken and why, and the order to build it in. "ScanApp" is a placeholder name.

## 0. Changes since this plan was written (03/10/2026)

The owner changed several decisions after this brief was written. **Where this section and the rest
of the document disagree, this section wins.** The sections below are left as written, so the
original reasoning stays readable.

| Topic | Was | Now |
|---|---|---|
| Name | "ScanApp" | **VMCI.Scanner**; the application users see is **Scanner** |
| Server framework | .NET 9 | **.NET 10** |
| Repository layout | `/client`, `/server/ScanApp.Api` | The existing layout: `backend/VMCI.Scanner.*` and `frontend/VMCI.Scanner.App`. The scanner module lives in `frontend/VMCI.Scanner.App/src/scanner/` |
| Storage | No database; accounts in a JSON file | **SQL Server**, database-first (`docs/sql/`). It holds accounts and recipients only — **still no documents** |
| Accounts file, `AccountStore` (section 7) | Hand-edited `accounts.json` | **Dropped.** Accounts are rows in `Account` |
| Admin UI | Out of scope | **In scope.** An administrator creates accounts, sets a temporary password, resets passwords, locks accounts and manages recipients in the application |
| Login (section 6) | Personal magic code, once per device | **Email and password.** No magic codes |
| First login | — | The administrator creates the account with a simple temporary password and hands it over personally (invitations happen outside the system). At first login the user must choose their own password before anything else. The temporary password does not have to meet the password rules; the user's own password does |
| Forgotten password | — | No self-service reset. The administrator sets a new temporary password; the user must change it at the next login |
| Staying signed in | Cookie per activated device | Unchanged in mechanism: persistent, sliding **cookie** of about 400 days, validated against the database on every request. Logging off and on again is possible |
| Blocking takes effect | When the code in the file changes | When the administrator locks the account or resets its password: every signed-in device is rejected on its next request (`Account.SecurityStamp`) |
| Brute force (section 6) | Rate limit on `activate` | Rate limit on `login`, per IP |
| One code, several devices (open question 3) | Assumed allowed | Moot: a user signs in with their password on as many devices as they like |
| Recipients (section 8) | List in the accounts file | Table `Recipient`. A user can add an address from the result screen; **only the administrator removes one** (open question 4) |
| Mail limits (section 8) | 50 mails per account per day, 20 recipients | **No limits** |
| Mail service (open question 2) | Azure Communication Services or SMTP | **Postponed.** Until it is chosen, the email endpoint answers 503 and the client hides *Email to...* |
| Hosting (open question 1) | Azure App Service, to decide | **The same environment as the VMCI application** |
| Name and icon (open question 5) | Open | Decided: Scanner, with the VMCI scan-line logo |

### Endpoints, as changed

| Method and route | Purpose |
|---|---|
| `POST /api/auth/login` | Email and password in, cookie out. Rate-limited. Answers whether a password change is required |
| `POST /api/auth/logout` | Removes the cookie on this device |
| `GET /api/auth/me` | The signed-in account; 401 when not signed in. The client calls this at startup |
| `POST /api/account/me/change-password` | Also the forced first-login change |
| `GET/POST /api/admin/accounts…` | Administrator: list, create, edit, lock, reset password, recipients |
| `GET/POST /api/recipients` | The account's recipients; add one |
| `POST /api/documents/pdf`, `POST /api/documents/email` | As in section 9 |
| `GET /api/info/version` | Liveness (instead of `/api/health`) |

While `MustChangePassword` is set, every endpoint except `me`, `logout` and `change-password`
answers 403.

## 1. What we are building

A small web app for the phone (also usable on a PC) that:

1. Photographs a paper document, or takes existing photos, one or more pages.
2. Cuts the document out of each photo and corrects the perspective, so the page looks like a flatbed scan.
3. Turns the pages into one **searchable PDF** (image plus invisible OCR text layer).
4. Delivers that PDF in one of two ways, chosen by the user per document:
   - **Share** through the phone's share menu (mail app, WhatsApp, Files, ...), or
   - **Email** it from the server to one of the user's fixed recipient addresses.

Nothing is stored: no database, no document archive. The server processes a document and forgets it.

### Quality bar

The crop and perspective correction are the core of the product. A scan that is cut wrong or still skewed is a failed scan. The user must always be able to correct the detected corners by hand.

### Out of scope

- Document archive, history, search.
- Extracting fields from the document (amounts, dates).
- An admin UI. Accounts are managed by editing a file on the server.
- Native apps. This is a PWA (installable web app).

## 2. Decisions already taken

| Topic | Decision | Reason |
|---|---|---|
| Shape | Standalone project: web client + backend | Independent of any other application |
| Crop and perspective correction | In the browser, OpenCV.js | Immediate feedback; user corrects corners before anything is uploaded |
| OCR and text layer | Azure Document Intelligence, model `prebuilt-read` with PDF output | Best quality; owner already has an Azure subscription; volume is under 100 pages per month |
| Azure calls | Only from the server | The Azure key never reaches the browser |
| Login | No username/password. A personal "magic code", entered once per device | See section 6 |
| Account management | A JSON file on the server, edited by hand by the owner | No admin UI wanted |
| Delivery | Share menu **or** server-side email to a fixed address | See section 8 |
| Storage | None, apart from the accounts file | Requirement |

## 3. Reuse constraint (important)

The scanner part of the client will later be reused inside another, existing application. That host application is:

- React 18 + TypeScript + Vite, installed as a PWA (`vite-plugin-pwa`).
- Styled with Bootstrap / react-bootstrap and CSS custom properties for theming (light and dark).
- Backed by its own .NET Web API, which will call Azure itself.

To keep the scanner portable, it lives in one self-contained folder with these rules:

- **Location**: `client/src/scanner/`, with a single public entry point `index.ts`.
- **No imports from outside the folder**, except `react` and the OpenCV loader. Enforce with an ESLint `no-restricted-imports` rule.
- **No backend calls.** The scanner's output is a list of page images. What happens next (upload, OCR, email) is the host app's business.
- **No UI framework.** Plain React and plain CSS. Colours come from CSS custom properties with fallbacks, so a host theme can override them.
- **No hard-coded text.** All labels come in through a `labels` prop with defaults.
- **Own README** in the folder describing the public API and how to embed it.

Public API of the module (indicative):

```ts
<DocumentScanner
  onComplete={(pages: ScannedPage[]) => void}
  onCancel={() => void}
  maxPages={20}
  labels={...}
/>

interface ScannedPage {
  blob: Blob        // JPEG, perspective-corrected
  width: number
  height: number
}
```

For the same reason the stack of this project matches the host: **React 18 + TypeScript + Vite** on the client and **.NET 9 Web API with classic controllers** on the server (no minimal APIs).

## 4. Architecture

```
┌──────────── browser (PWA) ────────────┐        ┌────────── server (.NET 9) ──────────┐
│ Activation screen                     │        │ AuthController      (magic code)    │
│ Scanner module  ── pages (JPEG) ──┐   │        │ DocumentsController (pdf, email)    │
│ Result screen                     │   │ HTTPS  │ RecipientsController                │
│   share / download / email  ◄─────┴───┼───────►│  ├─ ImagePdfBuilder                 │
└───────────────────────────────────────┘        │  ├─ IOcrProvider  → Azure Doc Intel │
                                                 │  ├─ IEmailSender  → mail service    │
                                                 │  └─ AccountStore  → accounts.json   │
                                                 └─────────────────────────────────────┘
```

- **One deployable**: the server serves the built client from `wwwroot`. Client and API share one origin, so the login cookie is first-party and no CORS setup is needed.
- **Development**: Vite dev server proxies `/api` to the .NET server.
- **HTTPS is mandatory**: camera access, PWA installation and secure cookies all require it.

### Repository layout

```
/client                    React + TS + Vite PWA
  /src/scanner             reusable scanner module (section 3)
  /src/app                 this app: activation, result screen, API client
/server
  /ScanApp.Api             controllers, services, auth
  /ScanApp.Tests
/docs
accounts.example.json      example of the accounts file (the real one is never committed)
```

## 5. Client

### Screens

1. **Activate** — one input for the magic code. Shown when the server answers 401.
2. **Scan** — the scanner module: page thumbnails, add page, corner editor.
3. **Result** — after the PDF is created: document name, then *Share*, *Email to...* and *Download*.

### Scanner module behaviour

- **Adding a page**
  - Phone: `<input type="file" accept="image/*" capture="environment">`. This uses the phone's own camera app at full resolution. A live camera preview with edge overlay is a later improvement, not part of the first version.
  - Existing photos: file picker with `multiple`, so several pages can be imported at once.
  - PC: file picker and drag-and-drop.
- **Decoding**: `createImageBitmap(file, { imageOrientation: 'from-image' })` so EXIF rotation is applied. Cap the working image at 4000 px on the long side; iOS Safari limits canvas area to roughly 16.7 megapixels.
- **Corner detection** on a copy downscaled to about 500 px: grayscale → blur → Canny → dilate → `findContours` → the largest contour that `approxPolyDP` reduces to four points and that covers more than about 20% of the image.
- **No usable contour**: start with a rectangle slightly inside the image borders and let the user drag.
- **Corner editor**: the photo with the quadrilateral drawn over it and four draggable handles. While dragging, show a magnifier offset from the finger; otherwise the finger hides the corner.
- **Warp** at full resolution with `getPerspectiveTransform` + `warpPerspective`. Output size follows from the edge lengths of the quadrilateral, long side capped at 2400 px (about 200 DPI for A4, enough for OCR).
- **Encoding**: JPEG quality 0.8, roughly 300–500 KB per A4 page.
- **Per page**: rotate 90°, re-edit corners, delete. Reordering is a later improvement.
- **Heavy work off the main thread** where practical (Web Worker), so the UI stays responsive on a phone.

### Loading OpenCV.js

- Load with a dynamic `import()` when the scanner opens; it is about 8–10 MB and must not be in the main bundle.
- Exclude it from the PWA precache (`globIgnores`) and add a runtime caching rule, so the first install stays small.

### Delivery from the result screen

- **Share**: `navigator.share({ files: [pdf] })`, guarded by `navigator.canShare`. It must be triggered directly by a tap; that is why sharing happens on a separate result screen after the PDF has arrived, not automatically at the end of processing.
- **Download**: always available, and the fallback where file sharing is not supported (for example Firefox on desktop).
- **Email to...**: a list of the account's fixed recipients plus "add address". Sends the PDF back to the server for mailing (section 8).

### Other client points

- **UI language**: Dutch. Keep all texts of the app shell in one file. (The scanner module gets its texts through props.)
- **Offline**: scanning and cropping work offline; creating the PDF needs the network. Show a clear message and keep the pages in memory so the user can retry.
- **Installed PWA on iOS** has its own storage, separate from Safari. A user must enter the magic code inside the installed app.

## 6. Authentication: magic code

### Behaviour

- The owner gives each user a personal code, out of band.
- The user enters it once on a device. From then on that device is activated indefinitely.
- The owner can block an account or change its code in the accounts file. That takes effect on the next request from every device of that account.
- The same code works on several devices (phone and PC) until it is blocked or changed. *Assumption; see open questions.*

### Mechanism

- `POST /api/auth/activate` with the code. The server looks up the account, compares in constant time, and on success signs the user in with ASP.NET Core **cookie authentication**.
- **Cookie**: `HttpOnly`, `Secure`, `SameSite=Strict`, persistent, sliding expiration with the maximum lifetime browsers accept (about 400 days). Every use renews it, so in practice it does not expire for an active user.
- **Cookie contents** (encrypted by ASP.NET Data Protection): account id and a *code stamp*, a hash of the code at activation time.
- **Every request**: in `OnValidatePrincipal`, check that the account still exists, is not blocked, and that the code stamp still matches. If not, reject and clear the cookie. This is what makes blocking and code changes immediate.
- **API calls never redirect**: return 401 instead of a redirect to a login page.
- **Data Protection keys must be persisted to disk** (`PersistKeysToFileSystem`) in a folder that survives restarts and deployments. Otherwise every restart logs out all devices.

### Protection

- **Brute force**: rate-limit `activate` per IP (for example 5 attempts per 15 minutes) with the built-in ASP.NET rate limiter. Codes are at least 12 characters from an unambiguous alphabet (no `0/O`, `1/I/L`); about 60 bits.
- **CSRF**: `SameSite=Strict` plus a check that the `Origin` header of state-changing requests matches the app's own origin.
- **Logging**: never log codes or document contents.

## 7. Accounts file

A single JSON file, path set in configuration, stored **outside** `wwwroot` and **outside** git.

```json
{
  "accounts": [
    {
      "id": "jan",
      "name": "Jan Peeters",
      "code": "K7QF-2MXD-9RTA",
      "blocked": false,
      "recipients": [
        { "email": "boekhouding@example.com", "label": "Boekhouding" }
      ]
    }
  ]
}
```

- **Codes are stored in plain text.** This is a deliberate trade-off so the owner can create and read codes by hand. The file therefore needs the same protection as the Azure keys.
- **The owner edits this file by hand** to add accounts, change codes, block accounts and remove recipients.
- **The server also writes to it**, but only to append a recipient to an account (section 8).

### `AccountStore` requirements

Because both a person and the server change this file, the store must be careful:

- **Reload on change**: before use, compare the file's last-write time with the loaded version and re-read when it differs. No restart needed after a manual edit.
- **Broken file after a manual edit**: keep the last valid version in memory, log an error on every load attempt, and refuse to write until the file is valid again. Never overwrite a file that failed to parse.
- **Writes are atomic and serialised**: one lock; re-read the file, apply the change, write to a temp file, then replace the original.
- **Writes change only what they must**: keep all other accounts and fields as they are, with stable formatting (indented JSON). Comments are not supported in the file.
- **Validation on load**: unique ids, unique codes, minimum code length.

## 8. Email

### Behaviour

- Each account has a list of fixed recipients.
- On the result screen the user picks one and sends.
- The user can type a new address in the client. The server validates it and appends it to that account's `recipients` in the accounts file. From then on it is in the list.
- The server only mails to addresses that are in the account's list. Adding an address is therefore always an explicit, logged step.
- Removing a recipient is done by the owner in the accounts file. *Assumption; see open questions.*

### Mechanism

- `IEmailSender` abstraction with one implementation. Recommended: **Azure Communication Services Email** with a verified custom domain (SPF and DKIM), because the Azure subscription already exists. SMTP via MailKit is the alternative if the owner prefers an existing mailbox.
- **Message**: fixed sender address; subject is the document name; short body stating which account sent it; the PDF as attachment.
- **Size**: mail services limit message size (Azure Communication Services: about 10 MB per message by default — verify). Check the PDF size before sending and return a clear error telling the user to use Share or Download instead.

### Protection

The server is in effect a mail relay for activated users, so:

- **Rate limit** per account (for example 50 mails per day) and a maximum number of recipients per account (for example 20).
- **Validate** addresses strictly; one address per request.
- **Log** every send: account id, recipient, size, outcome.

## 9. Server

### Endpoints

| Method and route | Purpose | Notes |
|---|---|---|
| `POST /api/auth/activate` | Exchange a magic code for the cookie | Rate-limited; 401 on unknown or blocked |
| `GET /api/auth/me` | Account name and recipients | 401 when not activated; the client uses this at startup |
| `POST /api/auth/deactivate` | Remove the cookie on this device | |
| `GET /api/recipients` | The account's recipients | |
| `POST /api/recipients` | Add a recipient (`email`, optional `label`) | Appends to the accounts file |
| `POST /api/documents/pdf` | Pages in, searchable PDF out | `multipart/form-data`, field `pages` repeated in page order |
| `POST /api/documents/email` | Mail a PDF to a fixed recipient | `multipart/form-data`: `file`, `recipient`, `fileName` |
| `GET /api/health` | Liveness | No auth |

All routes except `activate` and `health` require the cookie.

### Creating the PDF

1. Validate: page count, size per page, and that each part really is a JPEG or PNG.
2. Build an image-only PDF with one page per image, page size derived from the image's aspect ratio (PDFsharp or equivalent).
3. Send that PDF to Azure Document Intelligence: model `prebuilt-read`, output option `pdf`. Wait for completion, then fetch the generated PDF for that operation.
4. Return it as `application/pdf` with header `X-Searchable: true`.
5. **If Azure fails or is not configured**: return the image-only PDF with `X-Searchable: false`. The user must never lose a scan; the client shows a warning.

NuGet package: `Azure.AI.DocumentIntelligence`. Verify the exact method names for PDF output against the installed SDK version.

### Why two document endpoints

The server keeps no state between requests. The client receives the PDF, shows the result screen, and for email uploads the PDF again. That costs a few megabytes of upload but avoids temporary storage and clean-up on the server.

`/api/documents/email` must check that the upload is a PDF and within the size limit, and that the recipient is in the account's list.

### Configuration

```json
"Accounts": { "FilePath": "<absolute path outside wwwroot>/accounts.json" },
"DataProtection": { "KeysPath": "<persistent folder>" },
"DocumentIntelligence": {
  "Endpoint": "https://<resource>.cognitiveservices.azure.com/",
  "ModelId": "prebuilt-read"
},
"Email": { "SenderAddress": "scan@<domain>", "MaxMessageBytes": 9437184 },
"Limits": {
  "MaxPages": 20,
  "MaxPageBytes": 1572864,
  "MailsPerAccountPerDay": 50,
  "MaxRecipientsPerAccount": 20
}
```

- **Secrets are never in a committed file.** Azure key and mail connection string come from `dotnet user-secrets` in development and from environment variables in production.
- `accounts.json` and the Data Protection key folder are in `.gitignore` from the first commit.

### Azure resources (owner provisions these)

- **Document Intelligence**, region West Europe, tier **S0**. The free tier is believed to process only the first two pages of a document — verify, but assume S0.
- **Communication Services + Email** with a verified sender domain, if that mail option is chosen.
- Expected cost at under 100 pages per month: a few dollars at most. Check current prices on the Azure pricing page.

### Privacy note

The server stores no documents. Azure keeps analysis results for a limited time (24 hours, to verify) so the result can be fetched. If that matters, delete the result explicitly after fetching the PDF.

## 10. Build order

Each phase ends in something that can be tried on a real phone.

| Phase | Content | Done when |
|---|---|---|
| 0 | Repository skeleton: client and server projects, dev proxy, server serving the built client, `.gitignore` for secrets and the accounts file | One command runs both; a production build is served by the server |
| 1 | **Scanner module**, first one page then multiple: capture, detection, corner editor, warp, page list | On an iPhone and an Android phone, a photographed A4 on a table comes out straight and correctly cropped, with manual correction when detection misses |
| 2 | Authentication: accounts file, `AccountStore`, activate / me / deactivate, cookie, rate limiting, activation screen | Blocking an account in the file locks out an activated device on its next request |
| 3 | PDF: image PDF builder, Azure OCR, fallback, result screen with Share and Download | A three-page scan arrives in a mail app via Share, and its text can be searched and copied |
| 4 | Email: sender, recipients list, add recipient (written to the accounts file), limits | A PDF arrives at a fixed address; a newly added address appears in the accounts file |
| 5 | Polish: "document" filter (grayscale, background whitening, contrast), page reordering, live camera preview with edge overlay, keeping a draft across reloads | Optional |

Phase 1 comes first because it carries the most risk and is the part that will be reused. It needs no server.

Authentication comes before OCR so that the endpoint that costs money is never deployed unprotected.

## 11. Testing

- **Server unit tests**: `AccountStore` (reload after manual edit, broken file, concurrent appends, validation), activation and cookie validation (blocked account, changed code), recipient and size checks on the email endpoint.
- **Client unit tests** (Vitest): the pure geometry in the scanner module — ordering four corners, output size from a quadrilateral, the fallback rectangle.
- **Manual device matrix**, every phase: iPhone Safari, iPhone installed PWA, Android Chrome, Windows Chrome/Edge, Windows Firefox (expect Download instead of Share).
- **Test photos**: keep a small set of difficult cases in the repository — white paper on a light table, a shadow across the page, a strongly skewed shot, a crumpled receipt, a page with a dark background.

## 12. Risks and things to verify

- **Corner detection** is the main risk. Classic contour detection struggles with white paper on a light surface. The corner editor is the safety net; a small segmentation model is a later option if detection disappoints.
- **Not native quality.** The built-in document scanners of iOS and Android cannot be reached from a web app.
- **Azure PDF size**: check that the searchable PDF is not much larger than the image PDF sent in, because of the mail size limit.
- **Web Share with files**: verify on each target browser, including the installed iOS PWA.
- **Cookie lifetime**: confirm the installed iOS PWA keeps the cookie across weeks without use.
- **Unverified facts in this document**, all to confirm during implementation: SDK method names for PDF output, the free-tier two-page limit, the mail size limit, the 24-hour retention of Azure results, the 400-day cookie cap.

## 13. Open questions for the owner

Defaults are in the text above; change them here if they are wrong.

1. **Hosting**: where does the server run? It needs HTTPS, .NET 9 and a writable, persistent folder for the accounts file and Data Protection keys. Azure App Service is the obvious candidate.
2. **Mail sender**: which service and which sender address and domain?
3. **One code, several devices**: allowed (default), or should a code work on one device only?
4. **Removing recipients**: only by the owner in the file (default), or also from the client?
5. **Name** of the app and its icon.

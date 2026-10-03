---
name: scanner-logo-choice
description: "Scanner brand = logo proposal C (scan line) in VMCI green/grey, chosen by Carl; why the palette is what it is"
metadata:
  node_type: memory
  type: project
  originSessionId: c9ab8b1d-9bf7-4b81-9c21-832d33e97c23
  modified: 2026-10-02T08:29:18.999Z
---

On 2026-10-02 Carl chose logo proposal **C · Scanlijn** for VMCI.Scanner out of four (A braces around a
pdf page, B classic pdf icon with red band, C scan line, D wordmark): the grey VMCI braces `{ }` as a scan
frame around a green outlined page, a bright green scan line through it, wordmark "**vmci** scanner".

**Why:** the app is a VMCI app, so the brand is the VMCI house style (colours sampled from
`../VMCI/frontend/VMCI.App/public/logos`) combined with a scan/pdf symbol. No red, no web font.

**How to apply:** treat the logo and the green/grey palette as decided — do not redesign or "retune to a
brand" again. Implementation lives in `scripts/make-logos.ps1`, `src/components/ScannerLogo.tsx` and
`src/styles/theme.css` of `frontend/VMCI.Scanner.App`; read those for the actual values.

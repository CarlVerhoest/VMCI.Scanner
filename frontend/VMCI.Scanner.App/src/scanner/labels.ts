// Every text the scanner shows. The module has no hard-coded copy: a host passes its own `labels`
// (any subset); these Dutch defaults fill the rest.

export interface ScannerLabels {
  loading: string
  loadFailed: string
  takePhoto: string
  choosePhotos: string
  dropHint: string
  emptyHint: string
  processing: string
  pageLabel: (pageNumber: number) => string
  checkCorners: string
  rotate: string
  editCorners: string
  remove: string
  done: string
  cancel: string
  confirmCancel: string
  maxPagesReached: (maxPages: number) => string
  notAnImage: string
  processingFailed: string
  editorHint: string
  apply: string
  autoDetect: string
  fullImage: string
  invalidQuad: string
}

export const defaultLabels: ScannerLabels = {
  loading: 'Scanner laden…',
  loadFailed: 'De scanner kon niet geladen worden. Controleer de verbinding en probeer opnieuw.',
  takePhoto: 'Foto nemen',
  choosePhotos: "Foto's kiezen",
  dropHint: "Of sleep foto's hierheen.",
  emptyHint: "Neem een foto van het document, of kies bestaande foto's.",
  processing: 'Verwerken…',
  pageLabel: (n) => `Pagina ${n}`,
  checkCorners: 'Controleer de hoeken',
  rotate: 'Draaien',
  editCorners: 'Hoeken aanpassen',
  remove: 'Verwijderen',
  done: 'Klaar',
  cancel: 'Annuleren',
  confirmCancel: "De gescande pagina's gaan verloren. Doorgaan?",
  maxPagesReached: (max) => `Er kunnen maximaal ${max} pagina's in één document.`,
  notAnImage: 'Dit bestand is geen afbeelding.',
  processingFailed: 'Verwerken van de foto is mislukt.',
  editorHint: 'Sleep de hoeken naar de hoeken van het document.',
  apply: 'Toepassen',
  autoDetect: 'Automatisch',
  fullImage: 'Volledige foto',
  invalidQuad: 'De hoeken vormen geen geldige vierhoek.',
}

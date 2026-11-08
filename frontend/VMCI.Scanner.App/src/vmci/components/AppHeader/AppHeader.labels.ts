/** Texts shown by AppHeader; override via `labels` or VMCIProvider (`appHeader`). */
export interface AppHeaderLabels {
  /** Accessible name of the navigation landmark. */
  navigation: string
  /** Accessible name of the brand link (it holds only a logo). */
  home: string
  /** Accessible name of the hamburger toggle. */
  menu: string
}

export const appHeaderLabels: AppHeaderLabels = {
  navigation: 'Hoofdnavigatie',
  home: 'Naar de startpagina',
  menu: 'Menu',
}

export const appHeaderLabelsEn: AppHeaderLabels = {
  navigation: 'Main navigation',
  home: 'Go to the home page',
  menu: 'Menu',
}

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    appHeader: AppHeaderLabels
  }
}

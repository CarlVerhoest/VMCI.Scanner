/** Texts shown by ThemeSwitch; override via `labels` or VMCIProvider (`themeSwitch`). */
export interface ThemeSwitchLabels {
  /** Visible label, and the accessible name of the switch. */
  label: string
}

export const themeSwitchLabels: ThemeSwitchLabels = {
  label: 'Donkere modus',
}

export const themeSwitchLabelsEn: ThemeSwitchLabels = { label: 'Dark mode' }

declare module '../VMCIProvider/labels' {
  interface VMCILabelRegistry {
    themeSwitch: ThemeSwitchLabels
  }
}

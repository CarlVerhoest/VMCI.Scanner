import { faMoon, faSun } from '@fortawesome/free-solid-svg-icons'
import { PageHeader, SectionHeader, SegmentedControl, ThemeSwitch, useTheme, type Theme } from '@vmci/ui'

function Settings() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8 col-xl-6">
          <PageHeader
            title="Instellingen"
            subtitle="Bepaal hoe Scanner er op dit toestel uitziet."
            className="mb-4"
          />

          <div className="vmci-panel p-3 p-md-4">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <SectionHeader
                title="Weergave"
                subtitle="Kies een licht of donker thema. Uw voorkeur wordt in deze browser bewaard."
              />
              <span className="vmci-accent-dot flex-shrink-0 ms-3" aria-hidden="true"></span>
            </div>

            <ThemeSwitch wrapperClassName="fs-5 mb-4" />

            <SegmentedControl<Theme>
              aria-label="Themakeuze"
              fullWidth
              value={theme}
              onValueChanged={setTheme}
              options={[
                { value: 'light', label: 'Licht', icon: faSun },
                { value: 'dark', label: 'Donker', icon: faMoon },
              ]}
            />

            <p className="vmci-muted small mt-3 mb-0">
              Momenteel is de <strong>{isDark ? 'donkere' : 'lichte'}</strong> modus actief.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings

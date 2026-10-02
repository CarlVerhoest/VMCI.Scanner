import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSun, faMoon } from '@fortawesome/free-solid-svg-icons'
import { useTheme } from '../contexts/ThemeContext'

function Settings() {
  const { theme, setTheme } = useTheme()
  const isDark = theme === 'dark'

  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-12 col-md-10 col-lg-8 col-xl-6">
          <h1>Instellingen</h1>
          <p className="text-body-secondary mb-4">Bepaal hoe Scanner er op dit toestel uitziet.</p>

          <div className="scanner-panel p-3 p-md-4">
            <div className="d-flex justify-content-between align-items-start mb-3">
              <div>
                <h2 className="h5 mb-1">Weergave</h2>
                <p className="scanner-muted mb-0 small">
                  Kies een licht of donker thema. Uw voorkeur wordt in deze browser bewaard.
                </p>
              </div>
              <span className="scanner-accent-dot flex-shrink-0 ms-3" aria-hidden="true"></span>
            </div>

            <div className="form-check form-switch fs-5 mb-4">
              <input
                className="form-check-input"
                type="checkbox"
                role="switch"
                id="darkModeSwitch"
                checked={isDark}
                onChange={(e) => setTheme(e.target.checked ? 'dark' : 'light')}
              />
              <label className="form-check-label" htmlFor="darkModeSwitch">
                <FontAwesomeIcon icon={isDark ? faMoon : faSun} className="me-2" />
                Donkere modus {isDark ? 'aan' : 'uit'}
              </label>
            </div>

            <div className="btn-group w-100" role="group" aria-label="Themakeuze">
              <button
                type="button"
                className={`btn scanner-mode-option ${!isDark ? 'active' : ''}`}
                onClick={() => setTheme('light')}
                aria-pressed={!isDark}
              >
                <FontAwesomeIcon icon={faSun} className="me-2" />
                Licht
              </button>
              <button
                type="button"
                className={`btn scanner-mode-option ${isDark ? 'active' : ''}`}
                onClick={() => setTheme('dark')}
                aria-pressed={isDark}
              >
                <FontAwesomeIcon icon={faMoon} className="me-2" />
                Donker
              </button>
            </div>

            <p className="scanner-muted small mt-3 mb-0">
              Momenteel is de <strong>{isDark ? 'donkere' : 'lichte'}</strong> modus actief.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Settings

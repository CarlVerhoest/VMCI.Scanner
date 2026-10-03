import type { CSSProperties } from 'react'

interface ScannerLogoProps {
  // Height of the icon in px; the wordmark scales with it.
  height?: number
  // Icon only, without the "vmci scanner" wordmark.
  iconOnly?: boolean
}

// The VMCI Scanner logo: the VMCI braces as a scan frame around a page, with a scan line
// through it. Inline rather than an <img> so it follows the app's light/dark theme through the
// --scanner-logo-* tokens in src/styles/theme.css.
//
// The geometry is the same as in scripts/make-logos.ps1, which generates the static files under
// public/ (logos/, favicon.svg, PWA icons) - change both together.
function ScannerLogo({ height = 32, iconOnly = false }: ScannerLogoProps) {
  const style = { '--scanner-logo-height': `${height}px` } as CSSProperties

  return (
    <span className="scanner-logo" style={style}>
      <svg
        viewBox="0 0 64 64"
        fill="none"
        strokeLinecap="round"
        strokeLinejoin="round"
        role="img"
        aria-label={iconOnly ? 'VMCI Scanner' : undefined}
        aria-hidden={iconOnly ? undefined : true}
      >
        <path
          className="scanner-logo-grey"
          strokeWidth={4.5}
          d="M19 9 C14 9 12 11 12 16 L12 25 C12 29 9.5 32 5 32 C9.5 32 12 35 12 39 L12 48 C12 53 14 55 19 55"
        />
        <path
          className="scanner-logo-grey"
          strokeWidth={4.5}
          d="M45 9 C50 9 52 11 52 16 L52 25 C52 29 54.5 32 59 32 C54.5 32 52 35 52 39 L52 48 C52 53 50 55 45 55"
        />
        <path
          className="scanner-logo-green"
          strokeWidth={2.5}
          d="M22 12 L36 12 L42 18 L42 52 L22 52 Z"
        />
        <path className="scanner-logo-green" strokeWidth={2} d="M26.5 21 L34 21" />
        <path className="scanner-logo-green" strokeWidth={2} d="M26.5 26 L37.5 26" />
        <path className="scanner-logo-grey" strokeWidth={2} opacity={0.55} d="M26.5 39 L37.5 39" />
        <path className="scanner-logo-grey" strokeWidth={2} opacity={0.55} d="M26.5 44 L37.5 44" />
        <path
          className="scanner-logo-scan-fill"
          opacity={0.22}
          d="M23.5 32 L40.5 32 L40.5 36 L23.5 36 Z"
        />
        <path className="scanner-logo-scan" strokeWidth={3} d="M17 32 L47 32" />
      </svg>
      {!iconOnly && (
        <span className="scanner-logo-wordmark">
          <strong>vmci</strong> scanner
        </span>
      )}
    </span>
  )
}

export default ScannerLogo

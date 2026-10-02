import { ReactNode } from 'react'
import { Blocks } from 'react-loader-spinner'

export interface VMCISpinnerProps {
  active: boolean
  children: ReactNode
}

// Overlays `children` with a blocking spinner while `active` (e.g. during an
// in-flight save/submit), dimming the underlying content instead of replacing it.
//
// The backdrop covers the content (so the header stays usable-looking and the page cannot be
// clicked), but the spinner itself is fixed to the middle of the VIEWPORT. It used to be centred
// in the backdrop, i.e. halfway down the whole page - on a long page (a long assistant conversation,
// a big employee list) that put it out of sight while the page looked frozen.
export function VMCISpinner({ active, children }: VMCISpinnerProps) {
  return (
    <div style={{ position: 'relative', display: 'block', width: '100%' }}>
      <div style={{ display: 'block' }}>{children}</div>
      {active && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            zIndex: 9999,
            pointerEvents: 'all',
          }}
        >
          <div
            style={{
              position: 'fixed',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              zIndex: 10000,
            }}
          >
            <Blocks height={80} width={80} color="var(--scanner-accent)" />
          </div>
        </div>
      )}
    </div>
  )
}

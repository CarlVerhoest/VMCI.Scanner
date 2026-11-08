import { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ROUTES, ProtectedRoute } from './config/routes'
import AppHeader from './components/AppHeader'
import { LoadingState, Spinner, ThemeProvider, VMCIProvider, useHttpActivity } from '@vmci/ui'

// Every API call goes through the shared axiosInstance (see axiosConfig.ts), which tracks
// in-flight requests for us - so this one spinner, driven by useHttpActivity, covers every
// server interaction in the app with no per-page wiring. See the "Global loading spinner"
// section in this app's CLAUDE.md before adding another loading spinner elsewhere.
function AppContent() {
  const isLoadingHttp = useHttpActivity()

  return (
    <div className="App">
      <AppHeader />
      <Spinner active={isLoadingHttp}>
        <Suspense
          fallback={
            <div className="container mt-5">
              <LoadingState size="lg" />
            </div>
          }
        >
          <Routes>
            {ROUTES.map((route) => (
              <Route
                key={route.path}
                path={route.path}
                element={
                  <ProtectedRoute
                    needsAuthenticated={route.needsAuthenticated}
                    needsIsAdmin={route.needsIsAdmin}
                  >
                    {route.element}
                  </ProtectedRoute>
                }
              />
            ))}
            {/* 404 Not Found Route */}
            <Route
              path="*"
              element={
                <div className="container mt-5">
                  <h1>404 - Pagina niet gevonden</h1>
                  <p>De pagina die u zoekt, bestaat niet.</p>
                </div>
              }
            />
          </Routes>
        </Suspense>
      </Spinner>
    </div>
  )
}

function App() {
  return (
    <VMCIProvider>
      {/* The old storage key, so users keep the theme they picked before the library. */}
      <ThemeProvider storageKey="scanner-theme">
        <AuthProvider>
          <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
            <AppContent />
          </Router>
        </AuthProvider>
      </ThemeProvider>
    </VMCIProvider>
  )
}

export default App

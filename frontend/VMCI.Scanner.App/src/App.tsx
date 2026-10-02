import { Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import { ThemeProvider } from './contexts/ThemeContext'
import { ROUTES, ProtectedRoute } from './config/routes'
import AppHeader from './components/AppHeader'
import { VMCISpinner } from './components/VMCIUIComponents'
import { useHttpActivity } from './hooks/useHttpActivity'

// Every API call goes through the shared axiosInstance (see axiosConfig.ts), which tracks
// in-flight requests for us - so this one spinner, driven by useHttpActivity, covers every
// server interaction in the app with no per-page wiring. See the "Global loading spinner"
// section in this app's CLAUDE.md before adding another loading spinner elsewhere.
function AppContent() {
  const isLoadingHttp = useHttpActivity()

  return (
    <div className="App">
      <AppHeader />
      <VMCISpinner active={isLoadingHttp}>
        <Suspense
          fallback={
            <div className="container mt-5">
              <p>Laden...</p>
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
      </VMCISpinner>
    </div>
  )
}

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <Router future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <AppContent />
        </Router>
      </ThemeProvider>
    </AuthProvider>
  )
}

export default App

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
// Order matters: Bootstrap, the library's neutral tokens and bridge, then Scanner's values.
import 'bootstrap/dist/css/bootstrap.min.css'
import '@vmci/ui/styles/vmci-tokens.css'
import '@vmci/ui/styles/vmci.css'
import './styles/app-tokens.css'
import './styles/theme.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)

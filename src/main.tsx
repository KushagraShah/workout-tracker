import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import App from './App'
import { AuthProvider } from './contexts/AuthContext'
import './index.css'

const container = document.getElementById('root')
if (!container) throw new Error('Root element not found')

// Phase 1: register the minimal service worker (installable PWA shell).
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    void navigator.serviceWorker.register('/workout-tracker/sw.js').catch(() => {
      /* offline caching arrives in Phase 3 */
    })
  })
}

createRoot(container).render(
  <StrictMode>
    <HashRouter>
      <AuthProvider>
        <App />
      </AuthProvider>
    </HashRouter>
  </StrictMode>,
)

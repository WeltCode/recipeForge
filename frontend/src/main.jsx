import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import InstallPWA from './components/InstallPWA.jsx'

// Captura temprana del evento de instalación (Android/escritorio). Puede
// dispararse antes de que React monte, así que lo guardamos en window y
// avisamos al componente InstallPWA.
window.__rfInstallPrompt = null
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault()
  window.__rfInstallPrompt = e
  window.dispatchEvent(new Event('rf-installable'))
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <InstallPWA />
  </StrictMode>,
)

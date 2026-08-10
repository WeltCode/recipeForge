import { useEffect, useState } from 'react'
import { Flame, X } from './icons'

// Aviso/botón para instalar la PWA.
//  - Android / escritorio: usa el evento `beforeinstallprompt` (capturado
//    temprano en main.jsx en window.__rfInstallPrompt) → botón "Instalar".
//  - iOS Safari: no existe ese evento → muestra la instrucción manual.
// Se oculta si ya está instalada (standalone) o si el usuario lo descarta.
export default function InstallPWA() {
  const [prompt, setPrompt] = useState(() => window.__rfInstallPrompt || null)
  const [ios, setIos] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true
    if (standalone) { setHidden(true); return }

    const onInstallable = () => setPrompt(window.__rfInstallPrompt || null)
    const onInstalled = () => setHidden(true)
    window.addEventListener('rf-installable', onInstallable)
    window.addEventListener('appinstalled', onInstalled)

    const ua = window.navigator.userAgent.toLowerCase()
    const isIOS = /iphone|ipad|ipod/.test(ua)
    const isSafari = /safari/.test(ua) && !/crios|fxios|edgios|edga/.test(ua)
    if (isIOS && isSafari) setIos(true)

    return () => {
      window.removeEventListener('rf-installable', onInstallable)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  if (hidden || localStorage.getItem('rf_install_dismiss') === '1') return null
  if (!prompt && !ios) return null

  const doInstall = async () => {
    if (!prompt) return
    prompt.prompt()
    try { await prompt.userChoice } catch { /* usuario cerró el diálogo */ }
    window.__rfInstallPrompt = null
    setPrompt(null)
    setHidden(true)
  }
  const dismiss = () => {
    localStorage.setItem('rf_install_dismiss', '1')
    setHidden(true)
  }

  return (
    <div className="fixed inset-x-3 bottom-3 z-[70] mx-auto max-w-md rounded-2xl border border-[#e8531f]/30 bg-[#17130f] p-3 shadow-[0_18px_44px_-16px_rgba(0,0,0,.7)] ring-1 ring-white/10">
      <div className="flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-white shadow-inner">
          <Flame size={20} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="rf-cond text-sm font-600 uppercase tracking-wide text-white" style={{ fontWeight: 600 }}>Instala RecipeForge</p>
          <p className="text-xs leading-snug text-white/60">
            {ios ? 'Pulsa Compartir ↑ y luego “Añadir a pantalla de inicio”.' : 'Tenla como app en tu pantalla de inicio.'}
          </p>
        </div>
        {!ios && (
          <button
            onClick={doInstall}
            className="rf-ember-btn rf-cond shrink-0 rounded-lg px-3 py-2 text-xs font-600 uppercase tracking-wide text-white"
            style={{ fontWeight: 600 }}
          >
            Instalar
          </button>
        )}
        <button onClick={dismiss} aria-label="Cerrar" className="shrink-0 rounded-lg p-1.5 text-white/50 transition hover:text-white">
          <X size={16} />
        </button>
      </div>
    </div>
  )
}

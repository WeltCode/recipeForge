import { useEffect, useState } from 'react'
import { verifyEmail } from '../auth'
import Logo from './Logo'
import { Flame } from './icons'
import { Embers, StatusLamp } from '../lib/ui'

// Página de verificación de correo (enlace del email): /verificar?uid=&token=
// Sin login. Al verificar con éxito, la sesión queda iniciada y entra a la app.
export default function VerifyEmail() {
  const params = new URLSearchParams(window.location.search)
  const uid = params.get('uid') || ''
  const token = params.get('token') || ''
  const [state, setState] = useState(uid && token ? 'checking' : 'invalid')  // checking|ok|invalid|error
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (state !== 'checking') return undefined
    let alive = true
    verifyEmail(uid, token)
      .then(() => { if (alive) { setState('ok'); setTimeout(() => { window.location.href = '/' }, 1400) } })
      .catch((e) => { if (alive) { setState('error'); setMsg(e.message || 'No se pudo verificar.') } })
    return () => { alive = false }
  }, [state, uid, token])

  const title = { checking: 'Verificando…', ok: '¡Cuenta verificada!', invalid: 'Enlace no válido', error: 'No se pudo verificar' }[state]
  const body = {
    checking: 'Un momento, estamos activando tu cuenta.',
    ok: 'Tu correo está confirmado. Entrando a tu cocina…',
    invalid: 'El enlace está incompleto. Abre el enlace del correo tal cual, o pide uno nuevo desde el acceso.',
    error: msg || 'El enlace no es válido o ha caducado. Pide uno nuevo desde el acceso.',
  }[state]

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0e0b09] px-5 py-10">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 100% at 50% 30%, rgba(255,120,40,0.14), transparent 62%)' }} />
      <Embers count={16} />
      <div className="relative z-10 w-full max-w-md" style={{ animation: 'rf-ve-in .6s cubic-bezier(.2,.8,.2,1) both' }}>
        <style>{`@keyframes rf-ve-in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}`}</style>
        <div className="mb-6 flex justify-center">
          <Logo variant="dark" className="text-3xl drop-shadow-[0_3px_14px_rgba(232,83,31,0.4)]" />
        </div>
        <div className="overflow-hidden rounded-[22px] border border-[#aeb6bd] rf-steel rf-edge shadow-[0_44px_100px_-28px_rgba(0,0,0,.92)]">
          <div className="rf-cell flex items-center justify-between px-6 py-3.5">
            <span className="rf-cond flex items-center gap-2 text-[13px] uppercase tracking-[0.16em] text-[#f4efe8]" style={{ fontWeight: 500 }}>
              <StatusLamp size={8} /> Verificar cuenta
            </span>
            <Flame size={16} className="text-[#ff9a3d]" />
          </div>
          <div className="px-6 py-7 md:px-7">
            <h2 className="rf-cond text-2xl uppercase tracking-[0.03em] text-[#1c1611]" style={{ fontWeight: 600 }}>{title}</h2>
            <p className="mt-2 text-sm text-[#6a635c]">{body}</p>
            {(state === 'invalid' || state === 'error') && (
              <a href="/" className="rf-ember-btn rf-cond mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] uppercase tracking-[0.1em] text-white" style={{ fontWeight: 600 }}>
                <Flame size={18} /> Ir al acceso
              </a>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

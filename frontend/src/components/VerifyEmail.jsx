import { useEffect, useState } from 'react'
import { verifyEmail } from '../auth'
import Logo from './Logo'
import { Flame } from './icons'
import { Embers, StatusLamp } from '../lib/ui'

// Página de verificación de correo (enlace del email): /verificar?uid=&token=
// Al verificar con éxito, muestra una animación de "cuenta forjada" y luego entra
// a la app (con el tutorial de primer uso).
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
      .then(() => {
        if (!alive) return
        setState('ok')
        try { localStorage.setItem('rf_onboarding', '1') } catch { /* ignore */ }
        setTimeout(() => { window.location.href = '/' }, 2800)  // deja ver la animación
      })
      .catch((e) => { if (alive) { setState('error'); setMsg(e.message || 'No se pudo verificar.') } })
    return () => { alive = false }
  }, [state, uid, token])

  const title = { checking: 'Verificando…', invalid: 'Enlace no válido', error: 'No se pudo verificar' }[state]
  const body = {
    checking: 'Un momento, estamos activando tu cuenta.',
    invalid: 'El enlace está incompleto. Abre el enlace del correo tal cual, o pide uno nuevo desde el acceso.',
    error: msg || 'El enlace no es válido o ha caducado. Pide uno nuevo desde el acceso.',
  }[state]

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden bg-[#0e0b09] px-5 py-10">
      <style>{`
        @keyframes rf-ve-in{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
        @keyframes rf-badge-pop{0%{transform:scale(.4);opacity:0}55%{transform:scale(1.12)}100%{transform:scale(1);opacity:1}}
        @keyframes rf-glow{0%,100%{box-shadow:0 0 0 0 rgba(232,83,31,.0),0 12px 40px -10px rgba(232,83,31,.6)}50%{box-shadow:0 0 0 10px rgba(232,83,31,.10),0 16px 52px -8px rgba(255,130,45,.85)}}
        @keyframes rf-check{to{stroke-dashoffset:0}}
        @keyframes rf-spark{0%{transform:translate(0,0) scale(1);opacity:1}100%{transform:translate(var(--dx),var(--dy)) scale(.2);opacity:0}}
        @keyframes rf-fill{from{width:0}to{width:100%}}
        @media (prefers-reduced-motion: reduce){.rf-badge-pop,.rf-glow,.rf-spark,.rf-fill,.rf-check-path{animation:none!important}.rf-check-path{stroke-dashoffset:0}}
      `}</style>
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 100% at 50% 34%, rgba(255,120,40,0.16), transparent 62%)' }} />
      <Embers count={state === 'ok' ? 30 : 16} />

      <div className="relative z-10 w-full max-w-md" style={{ animation: 'rf-ve-in .6s cubic-bezier(.2,.8,.2,1) both' }}>
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

          <div className="px-6 py-8 md:px-7">
            {state === 'ok' ? (
              <div className="text-center">
                {/* Yunque de brasa: insignia que se forja con chispas y un check */}
                <div className="relative mx-auto grid h-24 w-24 place-items-center">
                  {/* chispas */}
                  {[[-46, -30], [42, -34], [-38, 26], [40, 24], [0, -52], [-54, -2], [54, -6]].map(([dx, dy], k) => (
                    <span key={k} aria-hidden className="rf-spark absolute h-1.5 w-1.5 rounded-full"
                      style={{ '--dx': `${dx}px`, '--dy': `${dy}px`, background: k % 2 ? '#ffcf7a' : '#ff7a34',
                        animation: `rf-spark ${0.7 + (k % 3) * 0.15}s ease-out ${0.15 + k * 0.05}s both` }} />
                  ))}
                  <div className="rf-badge-pop rf-glow grid h-24 w-24 place-items-center rounded-full"
                    style={{ background: 'radial-gradient(circle at 50% 40%, #ff8a4c, #c8371a)', animation: 'rf-badge-pop .5s cubic-bezier(.22,1,.36,1) both, rf-glow 1.8s ease-in-out .5s infinite' }}>
                    <svg width="46" height="46" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
                      <path className="rf-check-path" d="M20 6L9 17l-5-5" style={{ strokeDasharray: 32, strokeDashoffset: 32, animation: 'rf-check .5s ease-out .55s forwards' }} />
                    </svg>
                  </div>
                </div>
                <h2 className="rf-cond mt-5 text-2xl uppercase tracking-[0.04em] text-[#1c1611]" style={{ fontWeight: 600 }}>¡Cuenta forjada!</h2>
                <p className="mt-1.5 text-sm text-[#6a635c]">Tu cocina está lista. Entrando a tu panel…</p>
                <div className="mx-auto mt-5 h-1.5 w-48 overflow-hidden rounded-full bg-[#dfe3e7]">
                  <div className="h-full rounded-full" style={{ background: 'linear-gradient(90deg,#ff9a3d,#e8531f)', animation: 'rf-fill 2.6s linear both' }} />
                </div>
              </div>
            ) : (
              <>
                <h2 className="rf-cond text-2xl uppercase tracking-[0.03em] text-[#1c1611]" style={{ fontWeight: 600 }}>{title}</h2>
                <p className="mt-2 text-sm text-[#6a635c]">{body}</p>
                {(state === 'invalid' || state === 'error') && (
                  <a href="/" className="rf-ember-btn rf-cond mt-6 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] uppercase tracking-[0.1em] text-white" style={{ fontWeight: 600 }}>
                    <Flame size={18} /> Ir al acceso
                  </a>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </main>
  )
}

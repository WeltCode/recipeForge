import { useState, useRef, useEffect } from 'react'
import { login, signup, requestPasswordReset, resendVerification } from '../auth'
import Logo from './Logo'
import wokVideo from '../assets/wokvideo.mp4'
import { User, Lock, Eye, EyeOff, Flame } from './icons'
import { Embers, StatusLamp } from '../lib/ui'
import PoweredByWeltBrave from './branding/PoweredByWeltBrave'

/*
  DIRECTION — "La entrada a la forja" (login de RecipeForge)
  THESIS: iniciar sesión es entrar a la forja de una cocina profesional. El
    video del wok manda, vivo; a un lado el manifiesto de marca con brasas,
    al otro un panel-terminal de acero inoxidable liso donde "enciendes" tu
    cocina. Rechaza la tarjeta de login centrada y neutra.
  OWN-WORLD ("La Línea" amplificado): video cálido cinematográfico + viñeta;
    acero inox LISO con bisel y remaches (fascia de horno); celda negra de
    datos; fuego = brasas vivas + resplandor de calor + botón brasa que
    enciende. Oswald condensada / Inter / DM Mono.
  FIRST VIEWPORT: video a pantalla completa; izquierda manifiesto (logo grande
    + titular condensado + brasas), derecha panel de acero de acceso; CTA
    brasa que se calienta al pulsar.
  FORM: split editorial-hero dentro del mundo establecido.
*/

function Rivet({ className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`absolute h-2.5 w-2.5 rounded-full bg-gradient-to-br from-[#f4f6f7] to-[#9aa2a9] shadow-[inset_0_1px_1px_rgba(255,255,255,0.85),0_1px_2px_rgba(0,0,0,0.45)] ${className}`}
    />
  )
}

// Textos por modo del panel de acceso.
const MODE_COPY = {
  login: { title: 'Acceso a cocina', sub: 'Inicia sesión para encender tu estación.', cta: 'Encender cocina', busy: 'Encendiendo…' },
  signup: { title: 'Crea tu cocina', sub: 'Empieza tu prueba gratis. Sin tarjeta.', cta: 'Crear cuenta gratis', busy: 'Creando…' },
  forgot: { title: 'Recuperar acceso', sub: 'Te enviaremos una contraseña temporal para volver a entrar.', cta: 'Enviar contraseña temporal', busy: 'Enviando…' },
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Prefijos telefónicos con bandera (España + Latinoamérica + algunos más).
// [bandera, país, prefijo]. Valor del select = prefijo.
const DIAL_CODES = [
  ['🇪🇸', 'España', '+34'], ['🇲🇽', 'México', '+52'], ['🇦🇷', 'Argentina', '+54'],
  ['🇨🇴', 'Colombia', '+57'], ['🇵🇪', 'Perú', '+51'], ['🇨🇱', 'Chile', '+56'],
  ['🇻🇪', 'Venezuela', '+58'], ['🇪🇨', 'Ecuador', '+593'], ['🇧🇴', 'Bolivia', '+591'],
  ['🇺🇾', 'Uruguay', '+598'], ['🇵🇾', 'Paraguay', '+595'], ['🇬🇹', 'Guatemala', '+502'],
  ['🇭🇳', 'Honduras', '+504'], ['🇸🇻', 'El Salvador', '+503'], ['🇳🇮', 'Nicaragua', '+505'],
  ['🇨🇷', 'Costa Rica', '+506'], ['🇵🇦', 'Panamá', '+507'], ['🇩🇴', 'R. Dominicana', '+1'],
  ['🇧🇷', 'Brasil', '+55'], ['🇵🇹', 'Portugal', '+351'], ['🇬🇧', 'Reino Unido', '+44'],
  ['🇫🇷', 'Francia', '+33'], ['🇩🇪', 'Alemania', '+49'], ['🇮🇹', 'Italia', '+39'],
]

// Notificación "de forja": chapa de carbón con filo de brasa que baja con rebote
// y una chispa que late. Verde para éxito, brasa para error. Se autocierra.
function ForgeToast({ toast, onClose }) {
  useEffect(() => {
    if (!toast) return undefined
    const t = setTimeout(onClose, toast.kind === 'error' ? 5200 : 4200)
    return () => clearTimeout(t)
  }, [toast, onClose])
  if (!toast) return null
  const ok = toast.kind === 'ok'
  const accent = ok ? '#2f9e5f' : '#ff7a34'
  const ring = ok ? 'rgba(47,158,95,.55)' : 'rgba(255,122,52,.6)'
  return (
    <div key={toast.id} className="rf-toast" role="alert" aria-live="assertive"
      style={{ position: 'fixed', top: 20, left: '50%', zIndex: 80, maxWidth: 'min(92vw, 420px)' }}>
      <div style={{
        display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px',
        background: 'linear-gradient(180deg,#1f1811,#130f0b)', color: '#f4efe8',
        border: `1px solid ${accent}55`,
        borderRadius: 14, boxShadow: `0 20px 50px -18px rgba(0,0,0,.8), 0 0 34px -10px ${ring}`,
      }}>
        <span className="rf-spark" style={{
          marginTop: 1, display: 'grid', placeItems: 'center', height: 24, width: 24, flexShrink: 0,
          borderRadius: 8, background: `${accent}22`, color: accent,
        }}>
          {ok
            ? <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5" /></svg>
            : <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 9v4" /><path d="M12 17h.01" /><path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" /></svg>}
        </span>
        <div style={{ minWidth: 0, flex: 1 }}>
          {toast.title && <p className="rf-cond" style={{ margin: 0, fontSize: 12, letterSpacing: '.12em', textTransform: 'uppercase', color: accent, fontWeight: 600 }}>{toast.title}</p>}
          <p style={{ margin: '2px 0 0', fontSize: 13.5, lineHeight: 1.4, color: '#e8e1d7' }}>{toast.msg}</p>
        </div>
        <button type="button" onClick={onClose} aria-label="Cerrar" style={{ flexShrink: 0, color: '#a79b8c', background: 'none', border: 0, cursor: 'pointer', lineHeight: 0 }}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12" /></svg>
        </button>
      </div>
    </div>
  )
}

function Login({ onSuccess, notice }) {
  // Permite deep-link a la pantalla de alta desde la landing: /?signup=1
  const _wantSignup = new URLSearchParams(window.location.search).get('signup') === '1'
  const [mode, setMode] = useState(_wantSignup ? 'signup' : 'login')  // login | signup | forgot
  const [username, setUsername] = useState('')     // correo (login/alta/reset)
  const [password, setPassword] = useState('')
  const [restaurantName, setRestaurantName] = useState('')
  const [firstName, setFirstName] = useState('')
  const [accountType, setAccountType] = useState('restaurant')  // restaurant | individual
  const [phoneCode, setPhoneCode] = useState('+34')
  const [phoneNumber, setPhoneNumber] = useState('')
  const [address, setAddress] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [toast, setToast] = useState(null)   // { id, kind:'error'|'ok', title, msg }
  const [unverified, setUnverified] = useState('')  // correo pendiente de verificar
  const [hasVideo, setHasVideo] = useState(true)
  const panelRef = useRef(null)

  const copy = MODE_COPY[mode]

  // Sacudida "de forja" del panel (animación CSS re-disparable con reflow).
  const shake = () => {
    const el = panelRef.current
    if (!el) return
    el.classList.remove('rf-shake')
    void el.offsetWidth   // fuerza reflow para reiniciar la animación
    el.classList.add('rf-shake')
  }
  const notify = (kind, title, msg, { doShake = true } = {}) => {
    setToast({ id: Date.now(), kind, title, msg })
    if (doShake) shake()
  }

  const switchMode = (m) => {
    setMode(m); setToast(null)
  }

  // Validación propia (sin los mensajes por defecto del navegador) con avisos
  // bonitos y condiciones claras. Devuelve true si todo correcto.
  const validate = () => {
    const ident = username.trim()
    if (mode === 'signup' && !restaurantName.trim()) {
      notify('error', 'Falta un dato', 'Escribe el nombre de tu negocio o el tuyo.'); return false
    }
    if (mode === 'signup' && !phoneNumber.trim()) {
      notify('error', 'Falta el teléfono', 'El teléfono es obligatorio. Elige tu prefijo y escribe el número.'); return false
    }
    if (mode === 'signup' && accountType === 'restaurant' && !address.trim()) {
      notify('error', 'Falta la dirección', 'Indica la dirección del restaurante.'); return false
    }
    if (!ident) {
      notify('error', mode === 'login' ? 'Falta el acceso' : 'Falta el correo',
        mode === 'login' ? 'Escribe tu correo o usuario para continuar.' : 'Escribe tu correo electrónico para continuar.'); return false
    }
    // En alta/recuperar el identificador SÍ debe ser un correo; al iniciar sesión
    // se admite correo o usuario (algunas cuentas entran con su nombre de usuario).
    if (mode !== 'login' && !EMAIL_RE.test(ident)) {
      notify('error', 'Correo no válido', 'Revisa el correo: parece que le falta algo (ej. nombre@dominio.com).'); return false
    }
    if (mode !== 'forgot' && !password) {
      notify('error', 'Falta la contraseña', 'Escribe tu contraseña para continuar.'); return false
    }
    if (mode === 'signup' && password.length < 8) {
      notify('error', 'Contraseña corta', 'Usa al menos 8 caracteres para proteger tu cuenta.'); return false
    }
    return true
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setToast(null)
    setLoading(true)
    setUnverified('')
    try {
      if (mode === 'login') {
        const data = await login(username.trim(), password)
        onSuccess(data)
      } else if (mode === 'signup') {
        const data = await signup({
          restaurant_name: restaurantName.trim(),
          email: username.trim(),
          password,
          first_name: firstName.trim(),
          account_type: accountType,
          phone: `${phoneCode} ${phoneNumber.trim()}`.trim(),
          address: accountType === 'restaurant' ? address.trim() : '',
        })
        if (data.verification_required) {
          setMode('login')
          notify('ok', 'Revisa tu correo', 'Te enviamos un enlace para verificar tu cuenta. Ábrelo para activarla y poder entrar.', { doShake: false })
        } else {
          onSuccess(data)
        }
      } else {
        const detail = await requestPasswordReset(username.trim())
        notify('ok', 'Revisa tu correo', detail || 'Si el correo está registrado, te enviaremos una contraseña temporal.', { doShake: false })
      }
    } catch (err) {
      const raw = err.message || 'Algo salió mal.'
      if (err.code === 'email_not_verified') {
        setUnverified(err.email || username.trim())
        notify('error', 'Falta verificar tu correo', raw)
      } else if (mode === 'login' && /incorrect|401|credential/i.test(raw)) {
        notify('error', 'No pudimos entrar', 'El correo o la contraseña no coinciden. Revísalos e inténtalo de nuevo.')
      } else {
        notify('error', 'Ups', raw)
      }
    } finally {
      setLoading(false)
    }
  }

  const doResend = async () => {
    try {
      await resendVerification(unverified)
      notify('ok', 'Enviado', 'Si la cuenta sigue sin verificar, te reenviamos el enlace. Revisa tu correo.', { doShake: false })
    } catch (err) {
      notify('error', 'Ups', err.message || 'No se pudo reenviar.')
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0e0b09]">
      <style>{`
        @keyframes rf-in { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rf-in-l { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes rf-heat { 0%,100%{opacity:.5;transform:scale(1)} 45%{opacity:.82;transform:scale(1.05)} 70%{opacity:.62;transform:scale(1.02)} }
        .rf-cta.rf-cta-hot, .rf-cta:hover:not(:disabled) { box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 0 0 1px rgba(232,83,31,.4), 0 10px 30px -8px rgba(232,83,31,.85), 0 0 44px -6px rgba(255,130,45,.75) !important; }
        /* Sacudida de forja del panel al fallar (golpe seco, no un vaivén suave) */
        @keyframes rf-shake { 0%{transform:translateX(0)} 12%{transform:translateX(-9px) rotate(-.4deg)} 26%{transform:translateX(8px) rotate(.3deg)} 40%{transform:translateX(-6px)} 54%{transform:translateX(5px)} 68%{transform:translateX(-3px)} 82%{transform:translateX(2px)} 100%{transform:translateX(0)} }
        .rf-shake { animation: rf-shake .5s cubic-bezier(.36,.07,.19,.97) both; }
        /* Notificación que baja con un pequeño rebote */
        @keyframes rf-toast-in { 0%{opacity:0;transform:translate(-50%,-22px) scale(.94)} 62%{opacity:1;transform:translate(-50%,4px) scale(1.015)} 100%{opacity:1;transform:translate(-50%,0) scale(1)} }
        .rf-toast { animation: rf-toast-in .42s cubic-bezier(.2,.9,.2,1) both; }
        /* Chispa que late en el icono */
        @keyframes rf-spark { 0%,100%{transform:scale(1);opacity:.75} 50%{transform:scale(1.22);opacity:1} }
        .rf-spark { animation: rf-spark 1.1s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){ .rf-heat-anim,.rf-shake,.rf-toast,.rf-spark{animation:none !important} }
      `}</style>

      <ForgeToast toast={toast} onClose={() => setToast(null)} />

      {/* ── VIDEO DE FONDO: una persona cocinando al wok (protagonista, vivo) ── */}
      {hasVideo && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          style={{ filter: 'saturate(1.08) contrast(1.04)' }}
          autoPlay
          muted
          loop
          playsInline
          onError={() => setHasVideo(false)}
        >
          <source src={wokVideo} type="video/mp4" />
        </video>
      )}

      {/* Grade cálido + legibilidad a la izquierda + viñeta (el centro/fuego queda visible) */}
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(180deg, rgba(24,12,4,0.10) 0%, rgba(14,11,9,0.20) 100%)' }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'linear-gradient(100deg, rgba(9,7,5,0.90) 0%, rgba(9,7,5,0.55) 34%, rgba(9,7,5,0.08) 60%, transparent 78%)' }} />
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(135% 125% at 56% 42%, transparent 38%, rgba(8,6,4,0.62) 100%)' }} />
      <Embers count={22} />

      {/* ── CONTENIDO ── */}
      <div className="relative z-10 mx-auto grid min-h-screen max-w-6xl items-center gap-10 px-5 py-10 md:px-8 lg:grid-cols-2 lg:gap-14">

        {/* Manifiesto de marca */}
        <div className="order-1" style={{ animation: 'rf-in-l .7s cubic-bezier(.2,.8,.2,1) both' }}>
          <Logo variant="dark" className="text-4xl drop-shadow-[0_3px_14px_rgba(232,83,31,0.45)] md:text-5xl" />

          <span className="rf-cond mt-7 inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/[.06] px-3.5 py-1.5 text-[12px] uppercase tracking-[0.2em] text-[#ffcf9e] backdrop-blur-[2px]">
            <StatusLamp size={8} /> Cocina profesional
          </span>

          <h1 className="rf-cond mt-4 text-5xl uppercase leading-[0.92] tracking-[0.005em] text-white md:text-6xl lg:text-7xl" style={{ fontWeight: 600 }}>
            Donde se<br /><span className="text-[#ff7a34]">forja</span> cada plato
          </h1>

          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/70 md:text-base">
            El puesto de mando de las fichas técnicas de tu cocina. Estandariza cada plato,
            imprime fichas impecables y ten toda tu producción bajo control.
          </p>

          <div className="rf-mono mt-6 flex flex-wrap items-center gap-x-5 gap-y-2 text-[11px] uppercase tracking-[0.14em] text-white/45">
            <span className="flex items-center gap-1.5"><Flame size={13} className="text-[#ff9a3d]" /> Fichas técnicas</span>
            <span className="flex items-center gap-1.5"><Flame size={13} className="text-[#ff9a3d]" /> Escandallo</span>
            <span className="flex items-center gap-1.5"><Flame size={13} className="text-[#ff9a3d]" /> Exporta A4</span>
          </div>
        </div>

        {/* Panel-terminal de acero inoxidable */}
        <div className="order-2 w-full justify-self-center lg:justify-self-end lg:max-w-md">
          <div className="relative" style={{ animation: 'rf-in .7s cubic-bezier(.2,.8,.2,1) both' }}>
            {/* Resplandor de calor de la forja detrás del panel */}
            <div
              aria-hidden="true"
              className="rf-heat-anim pointer-events-none absolute -inset-8 -z-0"
              style={{ background: 'radial-gradient(circle at 50% 46%, rgba(255,120,40,0.5), rgba(232,83,31,0.18) 45%, transparent 70%)', animation: 'rf-heat 5s ease-in-out infinite' }}
            />

            <div ref={panelRef} className="relative overflow-hidden rounded-[22px] border border-[#aeb6bd] rf-steel rf-edge shadow-[0_44px_100px_-28px_rgba(0,0,0,.92)]">
              {/* remaches de la fascia */}
              <Rivet className="left-3 top-3" />
              <Rivet className="right-3 top-3" />
              <Rivet className="bottom-3 left-3" />
              <Rivet className="bottom-3 right-3" />

              {/* Celda negra: estado del sistema */}
              <div className="rf-cell flex items-center justify-between px-6 py-3.5">
                <span className="rf-cond flex items-center gap-2 text-[13px] uppercase tracking-[0.16em] text-[#f4efe8]" style={{ fontWeight: 500 }}>
                  <StatusLamp size={8} /> Cocina · En línea
                </span>
                <Flame size={16} className="text-[#ff9a3d]" />
              </div>

              {/* Cuerpo del terminal */}
              <div className="px-6 py-6 md:px-7">
                <h2 className="rf-cond text-2xl uppercase tracking-[0.03em] text-[#1c1611]" style={{ fontWeight: 600 }}>{copy.title}</h2>
                <p className="mt-1 text-sm text-[#6a635c]">{copy.sub}</p>

                {notice && (
                  <p className="mt-5 rounded-xl border border-[#e8531f]/25 bg-[#fff3ea] px-3 py-2.5 text-center text-sm text-[#8a3d15]">
                    {notice}
                  </p>
                )}

                <form onSubmit={handleSubmit} noValidate className="mt-6 space-y-4">
                  {mode === 'signup' && (
                    <>
                      <div>
                        <label className="rf-cond mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-[#7a736b]" style={{ fontWeight: 500 }}>¿Qué tipo de cuenta?</label>
                        <div className="grid grid-cols-2 gap-2">
                          {[['restaurant', 'Restaurante'], ['individual', 'Cocinero particular']].map(([val, lbl]) => {
                            const on = accountType === val
                            return (
                              <button
                                key={val}
                                type="button"
                                onClick={() => setAccountType(val)}
                                aria-pressed={on}
                                className={`rf-cond rounded-xl border px-3 py-2.5 text-[13px] uppercase tracking-[0.06em] transition ${on ? 'border-[#e8531f] bg-[#fff3ea] text-[#8a3d15]' : 'border-[#b9c0c6] bg-white text-[#6a635c] hover:border-[#e8531f]/50'}`}
                                style={{ fontWeight: on ? 600 : 500 }}
                              >
                                {lbl}
                              </button>
                            )
                          })}
                        </div>
                      </div>
                      <div>
                        <label className="rf-cond mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-[#7a736b]" style={{ fontWeight: 500 }}>{accountType === 'individual' ? 'Nombre de tu marca o el tuyo' : 'Nombre del restaurante o negocio'}</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a9188]"><Flame size={19} /></span>
                          <input
                            required
                            value={restaurantName}
                            onChange={(e) => setRestaurantName(e.target.value)}
                            placeholder={accountType === 'individual' ? 'Ej. Chef Marta Ríos' : 'Ej. Bistró Marea'}
                            className="w-full rounded-xl border border-[#b9c0c6] bg-white py-3 pl-11 pr-4 text-[#1c1611] shadow-[inset_0_1px_3px_rgba(20,16,8,0.10)] outline-none transition placeholder:text-[#a8a099] focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="rf-cond mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-[#7a736b]" style={{ fontWeight: 500 }}>Tu nombre</label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a9188]"><User size={19} /></span>
                          <input
                            value={firstName}
                            onChange={(e) => setFirstName(e.target.value)}
                            autoComplete="given-name"
                            placeholder="Ej. Marta"
                            className="w-full rounded-xl border border-[#b9c0c6] bg-white py-3 pl-11 pr-4 text-[#1c1611] shadow-[inset_0_1px_3px_rgba(20,16,8,0.10)] outline-none transition placeholder:text-[#a8a099] focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                          />
                        </div>
                      </div>
                      {/* Teléfono obligatorio con prefijo de país */}
                      <div>
                        <label className="rf-cond mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-[#7a736b]" style={{ fontWeight: 500 }}>Teléfono</label>
                        <div className="flex gap-2">
                          <select
                            value={phoneCode}
                            onChange={(e) => setPhoneCode(e.target.value)}
                            aria-label="Prefijo de país"
                            className="w-[150px] shrink-0 rounded-xl border border-[#b9c0c6] bg-white py-3 pl-3 pr-2 text-[#1c1611] shadow-[inset_0_1px_3px_rgba(20,16,8,0.10)] outline-none focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                          >
                            {DIAL_CODES.map(([flag, name, code]) => (
                              <option key={name} value={code}>{flag} {code} · {name}</option>
                            ))}
                          </select>
                          <input
                            type="tel"
                            inputMode="tel"
                            value={phoneNumber}
                            onChange={(e) => setPhoneNumber(e.target.value)}
                            autoComplete="tel-national"
                            placeholder="600 123 456"
                            className="w-full rounded-xl border border-[#b9c0c6] bg-white py-3 px-4 text-[#1c1611] shadow-[inset_0_1px_3px_rgba(20,16,8,0.10)] outline-none transition placeholder:text-[#a8a099] focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                          />
                        </div>
                      </div>
                      {/* Dirección: solo para restaurantes (los cocineros no la dan) */}
                      {accountType === 'restaurant' && (
                        <div>
                          <label className="rf-cond mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-[#7a736b]" style={{ fontWeight: 500 }}>Dirección del restaurante</label>
                          <input
                            value={address}
                            onChange={(e) => setAddress(e.target.value)}
                            autoComplete="street-address"
                            placeholder="Calle, número, ciudad"
                            className="w-full rounded-xl border border-[#b9c0c6] bg-white py-3 px-4 text-[#1c1611] shadow-[inset_0_1px_3px_rgba(20,16,8,0.10)] outline-none transition placeholder:text-[#a8a099] focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                          />
                        </div>
                      )}
                    </>
                  )}

                  <div>
                    <label className="rf-cond mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-[#7a736b]" style={{ fontWeight: 500 }}>{mode === 'login' ? 'Correo o usuario' : 'Correo'}</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a9188]">
                        <User size={19} />
                      </span>
                      <input
                        type={mode === 'login' ? 'text' : 'email'}
                        inputMode={mode === 'login' ? 'text' : 'email'}
                        autoFocus={mode !== 'signup'}
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        placeholder={mode === 'login' ? 'tu@correo.com o usuario' : 'tu@correo.com'}
                        className="w-full rounded-xl border border-[#b9c0c6] bg-white py-3 pl-11 pr-4 text-[#1c1611] shadow-[inset_0_1px_3px_rgba(20,16,8,0.10)] outline-none transition placeholder:text-[#a8a099] focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                      />
                    </div>
                  </div>

                  {mode !== 'forgot' && (
                    <div>
                      <label className="rf-cond mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-[#7a736b]" style={{ fontWeight: 500 }}>Contraseña</label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a9188]">
                          <Lock size={19} />
                        </span>
                        <input
                          required
                          type={showPass ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
                          placeholder="••••••••"
                          className="w-full rounded-xl border border-[#b9c0c6] bg-white py-3 pl-11 pr-11 text-[#1c1611] shadow-[inset_0_1px_3px_rgba(20,16,8,0.10)] outline-none transition placeholder:text-[#a8a099] focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass((v) => !v)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-[#9a9188] transition hover:text-[#5a5650]"
                          aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                        >
                          {showPass ? <EyeOff size={19} /> : <Eye size={19} />}
                        </button>
                      </div>
                      {mode === 'login' && (
                        <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
                          <button type="button" onClick={() => switchMode('forgot')} className="rf-cond text-[12px] uppercase tracking-[0.1em] text-[#b0552b] transition hover:text-[#8a3d15]">
                            ¿Olvidaste tu contraseña?
                          </button>
                          {unverified && (
                            <button type="button" onClick={doResend} className="rf-cond text-[12px] uppercase tracking-[0.1em] text-[#b0552b] transition hover:text-[#8a3d15]">
                              Reenviar verificación
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`rf-ember-btn rf-cta rf-cond flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] uppercase tracking-[0.1em] text-white transition active:translate-y-px disabled:opacity-80 ${loading ? 'rf-cta-hot' : ''}`}
                    style={{ fontWeight: 600 }}
                  >
                    <Flame size={18} /> {loading ? copy.busy : copy.cta}
                  </button>
                </form>

                {/* Cambio de modo */}
                <div className="mt-5 border-t border-[#d9d3ca] pt-4 text-center text-sm text-[#6a635c]">
                  {mode === 'login' && (
                    <span>¿No tienes cuenta?{' '}
                      <button type="button" onClick={() => switchMode('signup')} className="font-semibold text-[#b0552b] transition hover:text-[#8a3d15]">Crea tu cocina gratis</button>
                    </span>
                  )}
                  {mode === 'signup' && (
                    <span>¿Ya tienes cuenta?{' '}
                      <button type="button" onClick={() => switchMode('login')} className="font-semibold text-[#b0552b] transition hover:text-[#8a3d15]">Inicia sesión</button>
                    </span>
                  )}
                  {mode === 'forgot' && (
                    <button type="button" onClick={() => switchMode('login')} className="font-semibold text-[#b0552b] transition hover:text-[#8a3d15]">← Volver a iniciar sesión</button>
                  )}
                </div>
              </div>
            </div>

            {/* Marca del estudio */}
            <div className="mt-5 flex justify-center">
              <PoweredByWeltBrave className="scale-90" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}

export default Login

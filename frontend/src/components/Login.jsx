import { useState } from 'react'
import { login } from '../auth'
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

function Login({ onSuccess, notice }) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [hasVideo, setHasVideo] = useState(true)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(username.trim(), password)
      onSuccess(data)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#0e0b09]">
      <style>{`
        @keyframes rf-in { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:translateY(0)} }
        @keyframes rf-in-l { from{opacity:0;transform:translateX(-20px)} to{opacity:1;transform:translateX(0)} }
        @keyframes rf-heat { 0%,100%{opacity:.5;transform:scale(1)} 45%{opacity:.82;transform:scale(1.05)} 70%{opacity:.62;transform:scale(1.02)} }
        .rf-cta.rf-cta-hot, .rf-cta:hover:not(:disabled) { box-shadow: inset 0 1px 0 rgba(255,255,255,.3), 0 0 0 1px rgba(232,83,31,.4), 0 10px 30px -8px rgba(232,83,31,.85), 0 0 44px -6px rgba(255,130,45,.75) !important; }
        @media (prefers-reduced-motion: reduce){ .rf-heat-anim{animation:none !important} }
      `}</style>

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

            <div className="relative overflow-hidden rounded-[22px] border border-[#aeb6bd] rf-steel rf-edge shadow-[0_44px_100px_-28px_rgba(0,0,0,.92)]">
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
                <h2 className="rf-cond text-2xl uppercase tracking-[0.03em] text-[#1c1611]" style={{ fontWeight: 600 }}>Acceso a cocina</h2>
                <p className="mt-1 text-sm text-[#6a635c]">Inicia sesión para encender tu estación.</p>

                {notice && (
                  <p className="mt-5 rounded-xl border border-[#e8531f]/25 bg-[#fff3ea] px-3 py-2.5 text-center text-sm text-[#8a3d15]">
                    {notice}
                  </p>
                )}

                <form onSubmit={handleSubmit} className="mt-6 space-y-4">
                  <div>
                    <label className="rf-cond mb-1.5 block text-[12px] uppercase tracking-[0.14em] text-[#7a736b]" style={{ fontWeight: 500 }}>Correo</label>
                    <div className="relative">
                      <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[#9a9188]">
                        <User size={19} />
                      </span>
                      <input
                        required
                        autoFocus
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        autoComplete="username"
                        placeholder="tu@correo.com"
                        className="w-full rounded-xl border border-[#b9c0c6] bg-white py-3 pl-11 pr-4 text-[#1c1611] shadow-[inset_0_1px_3px_rgba(20,16,8,0.10)] outline-none transition placeholder:text-[#a8a099] focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                      />
                    </div>
                  </div>

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
                        autoComplete="current-password"
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
                  </div>

                  {error && (
                    <p className="rounded-xl border border-[#b03418]/25 bg-[#fbeae5] px-3 py-2.5 text-sm text-[#8f2c12]">
                      {error}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={`rf-ember-btn rf-cta rf-cond flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] uppercase tracking-[0.1em] text-white transition active:translate-y-px disabled:opacity-80 ${loading ? 'rf-cta-hot' : ''}`}
                    style={{ fontWeight: 600 }}
                  >
                    <Flame size={18} /> {loading ? 'Encendiendo…' : 'Encender cocina'}
                  </button>
                </form>

                <p className="mt-6 text-center text-xs text-[#9a9188]">
                  RecipeForge · Fichas técnicas de producción
                </p>
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

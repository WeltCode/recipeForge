import { useState } from 'react'
import { login } from '../auth'
import rfLogo from '../assets/lockup-white-on-dark.png'
import wokVideo from '../assets/wokvideo.mp4'
import { User, Lock, Eye, EyeOff, Flame } from './icons'
import { Embers } from '../lib/ui'
import PoweredByWeltBrave from './branding/PoweredByWeltBrave'

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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#0e0b09] px-4 py-10">
      <style>{`
        @keyframes rf-in { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>

      {/* ── VIDEO DE FONDO (cocineros al wok): la zona caliente ── */}
      {hasVideo && (
        <video
          className="absolute inset-0 h-full w-full object-cover"
          autoPlay
          muted
          loop
          playsInline
          onError={() => setHasVideo(false)}
        >
          <source src={wokVideo} type="video/mp4" />
        </video>
      )}
      {/* Oscurecido cálido + brasas ascendentes */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#0e0b09]/72 via-[#160f0b]/60 to-[#0e0b09]/85" />
      <Embers count={14} />

      {/* ── PANEL DE CONTROL DE ACERO ── */}
      <div className="relative z-10 w-full max-w-md" style={{ animation: 'rf-in .6s cubic-bezier(.2,.8,.2,1) both' }}>
        <div className="rf-steel rf-edge overflow-hidden rounded-[24px] border border-[#aeb6bd] shadow-[0_40px_90px_-25px_rgba(0,0,0,.85)]">

          {/* Cabecera: celda negra con el logo */}
          <div className="rf-cell relative flex items-center px-6 py-5">
            <img src={rfLogo} alt="RecipeForge" className="h-8 w-auto object-contain" />
          </div>

          {/* Cuerpo sobre acero */}
          <div className="relative px-6 py-7 md:px-8">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[#e8531f]/30 bg-[#e8531f]/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-[#b5420f]">
              <Flame size={13} /> Cocina profesional
            </span>
            <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#1c1611]">Bienvenido de vuelta</h1>
            <p className="mt-1 text-sm text-[#6a635c]">Inicia sesión para gestionar tus fichas técnicas.</p>

            {notice && (
              <p className="mt-5 rounded-xl border border-[#e8531f]/25 bg-[#fff3ea] px-3 py-2.5 text-center text-sm text-[#8a3d15]">
                {notice}
              </p>
            )}

            <form onSubmit={handleSubmit} className="mt-6 space-y-4">
              <div>
                <label className="rf-cond mb-1.5 block text-[12px] font-500 uppercase tracking-[0.14em] text-[#7a736b]" style={{ fontWeight: 500 }}>Usuario</label>
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
                    placeholder="tu usuario"
                    className="w-full rounded-xl border border-[#b9c0c6] bg-white py-3 pl-11 pr-4 text-[#1c1611] shadow-[inset_0_1px_2px_rgba(20,16,8,0.08)] outline-none transition placeholder:text-[#a8a099] focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                  />
                </div>
              </div>

              <div>
                <label className="rf-cond mb-1.5 block text-[12px] font-500 uppercase tracking-[0.14em] text-[#7a736b]" style={{ fontWeight: 500 }}>Contraseña</label>
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
                    className="w-full rounded-xl border border-[#b9c0c6] bg-white py-3 pl-11 pr-11 text-[#1c1611] shadow-[inset_0_1px_2px_rgba(20,16,8,0.08)] outline-none transition placeholder:text-[#a8a099] focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
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
                className="rf-ember-btn rf-cond flex w-full items-center justify-center gap-2 rounded-xl px-4 py-3.5 text-[15px] font-600 uppercase tracking-[0.08em] text-white transition active:translate-y-px disabled:opacity-60"
                style={{ fontWeight: 600 }}
              >
                <Flame size={17} /> {loading ? 'Entrando…' : 'Entrar a la cocina'}
              </button>
            </form>

            <p className="mt-6 text-center text-xs text-[#9a9188]">
              RecipeForge · Fichas técnicas de producción
            </p>
          </div>
        </div>

        {/* Marca del estudio, sobre la zona caliente */}
        <div className="mt-5 flex justify-center">
          <PoweredByWeltBrave className="scale-90" />
        </div>
      </div>
    </main>
  )
}

export default Login

import { useState } from 'react'
import { login } from '../auth'
import rfLogoWhite from '../assets/lockup-white-on-dark.png'
import wokVideo from '../assets/wokvideo.mp4'
import { User, Lock, Eye, EyeOff, Flame } from './icons'
import PoweredByWeltBrave from './branding/PoweredByWeltBrave'

function Login({ onSuccess }) {
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
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[#14100c] px-4 py-10">
      <style>{`
        @keyframes rf-in { from{opacity:0;transform:translateY(18px) scale(.98)} to{opacity:1;transform:translateY(0) scale(1)} }
      `}</style>

      {/* ── VIDEO DE FONDO (cocineros al wok) ── */}
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

      {/* Capa oscura uniforme para no cansar la vista */}
      <div className="pointer-events-none absolute inset-0 bg-black/55" />

      {/* ── TARJETA DE LOGIN ── */}
      <div
        className="relative z-10 w-full max-w-md rounded-[28px] border border-white/15 bg-white/[.08] p-8 shadow-[0_30px_80px_-20px_rgba(0,0,0,.7)] backdrop-blur-xl md:p-10"
        style={{ animation: 'rf-in .6s cubic-bezier(.2,.8,.2,1) both' }}
      >
        <div className="flex flex-col items-center">
          <img src={rfLogoWhite} alt="RecipeForge" className="h-12 w-auto object-contain" />
          <div className="mt-5 flex items-center gap-2 rounded-full border border-orange-400/30 bg-orange-500/10 px-3 py-1 text-xs font-medium text-orange-200">
            <Flame size={14} />
            Panel de cocina profesional
          </div>
          <h1 className="mt-5 text-2xl font-bold text-white">Bienvenido de vuelta</h1>
          <p className="mt-1 text-center text-sm text-white/60">
            Inicia sesión para gestionar tus fichas técnicas
          </p>
        </div>

        <form onSubmit={handleSubmit} className="mt-8 space-y-4">
          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">Usuario</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                <User size={19} />
              </span>
              <input
                required
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
                placeholder="tu usuario"
                className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-4 text-white placeholder-white/40 outline-none transition focus:border-orange-400/60 focus:bg-white/[.14] focus:ring-2 focus:ring-orange-500/30"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium uppercase tracking-wider text-white/50">Contraseña</label>
            <div className="relative">
              <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-white/40">
                <Lock size={19} />
              </span>
              <input
                required
                type={showPass ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                placeholder="••••••••"
                className="w-full rounded-xl border border-white/15 bg-white/10 py-3 pl-11 pr-11 text-white placeholder-white/40 outline-none transition focus:border-orange-400/60 focus:bg-white/[.14] focus:ring-2 focus:ring-orange-500/30"
              />
              <button
                type="button"
                onClick={() => setShowPass((v) => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 transition hover:text-white/70"
                aria-label={showPass ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              >
                {showPass ? <EyeOff size={19} /> : <Eye size={19} />}
              </button>
            </div>
          </div>

          {error && (
            <p className="rounded-xl border border-red-400/30 bg-red-500/15 px-3 py-2.5 text-sm text-red-100">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="group relative w-full overflow-hidden rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/40 transition hover:from-orange-500 hover:to-amber-400 disabled:opacity-60"
          >
            {loading ? 'Entrando…' : 'Entrar a la cocina'}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-white/35">
          RecipeForge · Fichas técnicas de producción
        </p>

        <div className="mt-5 flex justify-center">
          <PoweredByWeltBrave className="scale-90" />
        </div>
      </div>
    </main>
  )
}

export default Login

import { useState } from 'react'
import { changePassword, getFirstName } from '../auth'
import { Lock, Eye, EyeOff, Flame } from './icons'
import Logo from './Logo'

// Formulario de cambio de contraseña (reutilizable): cambio obligatorio tras
// entrar con una temporal, y cambio voluntario desde Ajustes.
export default function ChangePassword({ onDone, submitLabel = 'Cambiar contraseña' }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [show, setShow] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const submit = async (e) => {
    e.preventDefault()
    setError('')
    if (next.length < 8) { setError('La nueva contraseña debe tener al menos 8 caracteres.'); return }
    if (!/\d/.test(next) || !/[a-zA-Z]/.test(next)) { setError('Usa al menos una letra y un número.'); return }
    if (next !== confirm) { setError('Las contraseñas no coinciden.'); return }
    setSaving(true)
    try {
      await changePassword(current, next)
      onDone && onDone()
    } catch (err) { setError(err.message) } finally { setSaving(false) }
  }

  const inputCls = 'w-full rounded-lg border border-steel-300 bg-white py-2.5 pl-10 pr-10 text-[14px] text-ink outline-none focus:border-ember/60 focus:ring-2 focus:ring-ember/15'
  const field = (label, value, setValue, ac) => (
    <label className="block">
      <span className="mb-1 block text-[13px] text-ink-2">{label}</span>
      <div className="relative">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-3"><Lock size={16} /></span>
        <input required type={show ? 'text' : 'password'} value={value} onChange={(e) => setValue(e.target.value)} autoComplete={ac} className={inputCls} />
      </div>
    </label>
  )

  return (
    <form onSubmit={submit} className="space-y-3">
      {field('Contraseña actual', current, setCurrent, 'current-password')}
      <div className="relative">
        {field('Nueva contraseña', next, setNext, 'new-password')}
        <button type="button" onClick={() => setShow((v) => !v)} className="absolute right-3 top-[34px] text-ink-3 hover:text-ink" aria-label={show ? 'Ocultar' : 'Mostrar'}>
          {show ? <EyeOff size={17} /> : <Eye size={17} />}
        </button>
      </div>
      {field('Repite la nueva contraseña', confirm, setConfirm, 'new-password')}
      <p className="text-[12px] text-ink-3">Mínimo 8 caracteres, con al menos una letra y un número.</p>
      {error && <p className="rounded-lg border border-danger/30 bg-danger/8 px-3 py-2 text-[13px] text-danger">{error}</p>}
      <button type="submit" disabled={saving} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">
        {saving ? 'Guardando…' : submitLabel}
      </button>
    </form>
  )
}

// Pantalla obligatoria: el usuario entró con una contraseña temporal y debe
// definir la suya antes de usar la app.
export function ForcedPasswordScreen({ onDone, onLogout }) {
  const name = getFirstName()
  return (
    <main className="grid min-h-screen place-items-center bg-carbon p-4 hot-zone">
      <div className="w-full max-w-md rounded-2xl steel-plate p-6 shadow-[var(--shadow-forge)]">
        <div className="mb-4 flex items-center justify-between">
          <Logo className="text-2xl" />
          <Flame size={18} className="text-[#ff9a3d]" />
        </div>
        <h1 className="pass-title text-[20px] text-ink">Crea tu contraseña</h1>
        <p className="mt-1 text-[13px] text-ink-2">
          {name ? `Hola, ${name}. ` : ''}Entraste con una contraseña temporal. Define una propia para continuar.
        </p>
        <div className="mt-5">
          <ChangePassword onDone={onDone} submitLabel="Guardar y entrar" />
        </div>
        <button onClick={onLogout} className="mt-4 text-[12px] text-ink-3 underline hover:text-ink">Cerrar sesión</button>
      </div>
    </main>
  )
}

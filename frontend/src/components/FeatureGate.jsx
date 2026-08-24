import { useState } from 'react'
import { authFetch } from '../auth'
import { Lock, X, Flame } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

// Qué desbloquea cada plan (para el modal de mejora). `key` = valor real del plan.
const UPGRADE_PLANS = [
  {
    name: 'Premium', key: 'pro', color: '#ff9a3d',
    points: ['Plantillas personalizables', 'Escandallo, alérgenos e inventario', 'Hasta 8 usuarios', 'Recetas ilimitadas'],
  },
  {
    name: 'Business', key: 'business', color: '#e8531f',
    points: ['Todo lo de Premium', 'Proveedores y coste desde compras', 'Roles y permisos por persona', 'Hasta 20 usuarios · multi-local'],
  },
]

// Modal "Mejora tu plan": muestra qué aporta cada plan y permite SOLICITAR la
// mejora de verdad (crea un PlanChangeRequest que el superadmin ve y resuelve).
// Solo el dueño puede solicitar; a otros roles el backend responde 403 y se
// les indica que lo pida el dueño.
export function UpgradeModal({ open, onClose, feature }) {
  const [sent, setSent] = useState('')      // nombre del plan solicitado
  const [busy, setBusy] = useState('')      // key del plan enviándose
  const [error, setError] = useState('')
  if (!open) return null

  const solicitar = async (p) => {
    setBusy(p.key); setError('')
    try {
      const res = await authFetch(`${API_BASE}/plan-requests/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_plan: p.key }),
      })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        throw new Error(res.status === 403
          ? 'Solo el dueño del restaurante puede solicitar el cambio de plan.'
          : (Object.values(d).flat().join(' ') || `Error ${res.status}`))
      }
      setSent(p.name)
    } catch (e) {
      setError(e.message)
    } finally {
      setBusy('')
    }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="rf-steel rf-edge w-full max-w-lg overflow-hidden rounded-2xl border border-[#aeb6bd] shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="rf-hot rf-grain rf-pass-edge relative flex items-center justify-between px-6 py-5">
          <div>
            <h3 className="rf-cond flex items-center gap-2 text-lg font-600 uppercase tracking-[0.06em] text-white" style={{ fontWeight: 600 }}>
              <Flame size={18} /> Mejora tu plan
            </h3>
            {feature && <p className="text-xs text-white/60">Desbloquea <strong className="text-[#ffcf9e]">{feature}</strong> y mucho más.</p>}
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white"><X size={20} /></button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-6">
          {sent ? (
            <p className="rounded-xl border border-[#e8531f]/25 bg-[#fff3ea] px-3 py-4 text-center text-sm text-[#8a3d15]">
              ✓ Solicitud de plan <strong>{sent}</strong> enviada. El administrador la activará.
            </p>
          ) : (
            UPGRADE_PLANS.map((p) => (
              <div key={p.name} className="rounded-xl border border-[#c4ccd2] bg-white p-4">
                <p className="rf-cond text-sm font-600 uppercase tracking-wide" style={{ color: p.color, fontWeight: 600 }}>{p.name}</p>
                <ul className="mt-2 space-y-1">
                  {p.points.map((pt) => (
                    <li key={pt} className="flex items-start gap-2 text-sm text-[#3a352f]">
                      <span style={{ color: p.color }}>•</span> {pt}
                    </li>
                  ))}
                </ul>
                <button onClick={() => solicitar(p)} disabled={busy === p.key}
                  className="rf-ember-btn rf-cond mt-3 w-full rounded-lg px-4 py-2.5 text-[13px] font-600 uppercase tracking-wide text-white disabled:opacity-60" style={{ fontWeight: 600 }}>
                  {busy === p.key ? 'Enviando…' : `Solicitar ${p.name}`}
                </button>
              </div>
            ))
          )}
          {error && <p className="rounded-lg border border-[#c4ccd2] bg-white/70 px-3 py-2 text-center text-[13px] text-[#8a3d15]">{error}</p>}
          <p className="text-center text-xs text-[#9a9188]">El cambio de plan lo activa el administrador · Un producto de WeltBrave.</p>
        </div>
      </div>
    </div>
  )
}

// Sección completa bloqueada por el plan: icono con candado, qué aporta, y CTA
// para mejorar. Se usa como contenido de secciones no incluidas en el plan.
export function LockedSection({ icon: Icon, title, requiredPlan, points }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="rf-steel rf-edge flex flex-col items-center rounded-3xl border border-[#aeb6bd] px-6 py-16 text-center">
      <span className="relative flex h-16 w-16 items-center justify-center rounded-2xl bg-[#17130f] text-[#ff9a3d] shadow-lg ring-1 ring-white/10">
        {Icon && <Icon size={30} />}
        <span className="absolute -bottom-1.5 -right-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-white shadow"><Lock size={13} /></span>
      </span>
      <h2 className="rf-cond mt-5 text-2xl font-600 uppercase tracking-wide text-[#1c1611]" style={{ fontWeight: 600 }}>{title}</h2>
      <p className="mt-1 text-sm text-[#6a635c]">Disponible en el plan <strong className="text-[#b5420f]">{requiredPlan}</strong>.</p>
      {points && (
        <ul className="mt-4 space-y-1.5 text-sm text-[#3a352f]">
          {points.map((p) => <li key={p} className="flex items-center gap-2"><span className="text-[#e8531f]">•</span> {p}</li>)}
        </ul>
      )}
      <button onClick={() => setOpen(true)} className="rf-ember-btn rf-cond mt-6 rounded-xl px-5 py-2.5 text-sm font-600 uppercase tracking-wide text-white" style={{ fontWeight: 600 }}>
        Mejora tu plan
      </button>
      <UpgradeModal open={open} onClose={() => setOpen(false)} feature={title} />
    </div>
  )
}

// Envuelve una función o sección. Si `locked`, muestra el contenido atenuado
// con un candado; al pulsarlo abre el modal de mejora. Si no, pasa el contenido.
export default function FeatureGate({ locked, feature, requiredPlan, children }) {
  const [open, setOpen] = useState(false)
  if (!locked) return children
  return (
    <div className="relative">
      <div aria-hidden="true" className="pointer-events-none select-none opacity-40 blur-[1px]">{children}</div>
      <button
        onClick={() => setOpen(true)}
        className="absolute inset-0 flex flex-col items-center justify-center gap-2 rounded-xl bg-[#17130f]/10 transition hover:bg-[#17130f]/15"
      >
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#17130f] text-[#ff9a3d] shadow-lg ring-1 ring-white/10">
          <Lock size={20} />
        </span>
        <span className="rf-cond rounded-full bg-[#17130f] px-3 py-1 text-xs font-600 uppercase tracking-wide text-white shadow" style={{ fontWeight: 600 }}>
          {requiredPlan ? `Plan ${requiredPlan}` : 'Mejora tu plan'}
        </span>
      </button>
      <UpgradeModal open={open} onClose={() => setOpen(false)} feature={feature} />
    </div>
  )
}

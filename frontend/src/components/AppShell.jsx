import { useState } from 'react'
import Logo from './Logo'
import { LogOut, Lock, X, Flame, ChevronRight, Plus } from './icons'
import { initials } from '../lib/ui'

const ROLE_LABELS = { superadmin: 'Super Admin', owner: 'Owner', manager: 'Manager', editor: 'Editor', viewer: 'Viewer' }
const PLAN_LABELS = { prueba: 'Prueba', basico: 'Básico (Cocinero)', pro: 'Premium', business: 'Business' }

// Selector de local (multi-local). Chip estático si el usuario tiene 1 solo
// restaurante; desplegable para cambiar de local si tiene varios.
function RestaurantSwitcher({ restaurants, restaurantName, onSwitch, canAddLocal, onAddLocal }) {
  const [open, setOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState('')
  const list = Array.isArray(restaurants) ? restaurants : []
  const multi = list.length > 1
  const active = list.find((r) => r.is_active) || list[0]
  const label = active?.name || restaurantName
  if (!label) return null

  const chip = (
    <span className="rf-cond inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-[#ff9a3d]/25 bg-[#e8531f]/15 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#ffcf9e]">
      <Flame size={12} /> <span className="truncate">{label}</span>
    </span>
  )
  // Sin multi y sin poder añadir locales → chip estático de siempre.
  if (!multi && !canAddLocal) return <div className="px-5 pb-4">{chip}</div>

  const submitNew = async () => {
    const name = newName.trim()
    if (!name) return
    setBusy(true); setErr('')
    try {
      await onAddLocal?.(name)   // recarga la app al terminar
    } catch (e) {
      setErr(e.message || 'No se pudo crear el local.'); setBusy(false)
    }
  }

  return (
    <div className="relative px-5 pb-4">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center gap-2 rounded-xl border border-white/10 bg-white/[.04] px-3 py-2 text-left transition hover:bg-white/[.08]"
      >
        <Flame size={13} className="shrink-0 text-[#ff9a3d]" />
        <span className="min-w-0 flex-1">
          <span className="rf-cond block truncate text-[12px] uppercase tracking-[0.12em] text-[#ffcf9e]">{label}</span>
          <span className="block text-[10px] text-white/40">{multi ? 'Cambiar de local' : 'Mis locales'}</span>
        </span>
        <ChevronRight size={14} className={`shrink-0 text-white/40 transition-transform ${open ? 'rotate-90' : ''}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setAdding(false) }} />
          <div className="absolute inset-x-5 top-full z-50 mt-1 overflow-hidden rounded-xl border border-white/10 bg-[#171412] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.7)]">
            {list.map((r) => (
              <button
                key={r.id}
                onClick={() => { setOpen(false); if (!r.is_active) onSwitch?.(r.id) }}
                className={`flex w-full items-center gap-2 px-3 py-2.5 text-left transition ${r.is_active ? 'bg-[#e8531f]/15' : 'hover:bg-white/[.06]'}`}
              >
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${r.is_active ? 'bg-[#ff9a3d]' : 'bg-white/20'}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[13px] font-medium text-white/90">{r.name}</span>
                  <span className="rf-cond block truncate text-[10px] uppercase tracking-wide text-white/40">
                    {ROLE_LABELS[r.role] || r.role}{r.plan && ` · ${PLAN_LABELS[r.plan] || r.plan}`}
                  </span>
                </span>
                {r.is_active && <span className="rf-cond shrink-0 text-[10px] uppercase tracking-wide text-[#ffcf9e]">Activo</span>}
              </button>
            ))}
            {canAddLocal && (
              <div className="border-t border-white/10">
                {adding ? (
                  <div className="p-2.5">
                    <input
                      autoFocus value={newName} onChange={(e) => setNewName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === 'Enter') submitNew() }}
                      placeholder="Nombre del nuevo local"
                      className="w-full rounded-lg border border-white/15 bg-white/[.06] px-3 py-2 text-[13px] text-white outline-none placeholder:text-white/35 focus:border-[#ff9a3d]/50"
                    />
                    {err && <p className="mt-1.5 text-[11px] text-[#ff9a7a]">{err}</p>}
                    <div className="mt-2 flex gap-2">
                      <button onClick={submitNew} disabled={busy} className="flex-1 rounded-lg bg-ember px-3 py-1.5 text-[12px] font-medium text-cream hover:bg-ember-hi disabled:opacity-60">{busy ? 'Creando…' : 'Crear local'}</button>
                      <button onClick={() => { setAdding(false); setNewName(''); setErr('') }} className="rounded-lg border border-white/15 px-3 py-1.5 text-[12px] text-white/70 hover:bg-white/[.06]">Cancelar</button>
                    </div>
                  </div>
                ) : (
                  <button onClick={() => setAdding(true)} className="flex w-full items-center gap-2 px-3 py-2.5 text-left text-[#ffcf9e] transition hover:bg-white/[.06]">
                    <Plus size={15} /> <span className="rf-cond text-[12px] uppercase tracking-[0.1em]">Añadir local</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  )
}

// Avatar del usuario: foto de perfil subida si existe, si no las iniciales.
function Avatar({ avatar, name, size = 36 }) {
  const cls = 'shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-white'
  const style = { width: size, height: size, fontSize: Math.round(size * 0.34) }
  return avatar
    ? <img src={avatar} alt="" className={`${cls} object-cover`} style={style} />
    : <span className={`flex items-center justify-center font-bold ${cls}`} style={style}>{initials(name)}</span>
}

function Burger({ size = 22 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  )
}

// Barra lateral de navegación (la "línea del pase" en acero). Las secciones
// bloqueadas por el plan muestran un candado. En móvil se pliega a un cajón.
export default function AppShell({ sections, active, onNavigate, username, role, plan, restaurantName, restaurants, onSwitchRestaurant, canAddLocal, onAddLocal, avatar, onLogout, children }) {
  const [open, setOpen] = useState(false)
  const go = (id) => { onNavigate(id); setOpen(false) }

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-5 pt-5">
        <Logo variant="dark" className="text-xl" />
        <button className="text-white/50 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
      </div>

      <RestaurantSwitcher restaurants={restaurants} restaurantName={restaurantName} onSwitch={onSwitchRestaurant} canAddLocal={canAddLocal} onAddLocal={onAddLocal} />

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {sections.map((s, i) => {
          const Icon = s.icon
          const isActive = s.id === active
          const showGroup = s.group && s.group !== (i > 0 ? sections[i - 1].group : undefined)
          return (
            <div key={s.id}>
            {showGroup && (
              <p className="rf-cond px-3 pb-1 pt-5 text-[10px] font-600 uppercase tracking-[0.2em] text-white/30" style={{ fontWeight: 600 }}>{s.group}</p>
            )}
            <button
              onClick={() => go(s.id)}
              className={`group relative flex w-full items-center gap-3 rounded-xl px-3 py-2.5 transition ${
                isActive ? 'bg-white/[.10]' : 'hover:bg-white/[.06]'
              }`}
            >
              {isActive && (
                <span className="absolute left-0 top-1/2 h-7 w-[3px] -translate-y-1/2 rounded-r-full bg-gradient-to-b from-[#ff9a3d] to-[#e8531f] shadow-[0_0_10px_rgba(232,83,31,0.6)]" />
              )}
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition ${
                isActive
                  ? 'bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-white shadow-md'
                  : 'text-white/55 group-hover:text-[#ff9a3d]'
              }`}>
                <Icon size={19} />
              </span>
              <span className={`rf-cond flex-1 text-left text-sm uppercase tracking-wide transition ${
                isActive ? 'text-white' : 'text-white/65 group-hover:text-white/90'
              }`} style={{ fontWeight: 500 }}>
                {s.label}
              </span>
              {s.locked && <Lock size={14} className="shrink-0 text-white/35" />}
            </button>
            </div>
          )
        })}
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-2.5 px-2 py-1.5">
          <Avatar avatar={avatar} name={username} size={36} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-white/90">{username}</p>
            <p className="rf-cond truncate text-[11px] uppercase tracking-wide text-[#ffcf9e]">
              {ROLE_LABELS[role] || role}{plan && ` · ${PLAN_LABELS[plan] || plan}`}
            </p>
          </div>
        </div>
        <button onClick={onLogout} className="mt-1 flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium text-white/60 transition hover:bg-white/[.06] hover:text-white/90">
          <LogOut size={17} /> Cerrar sesión
        </button>
      </div>
    </div>
  )

  return (
    <div className="bg-steel-100 min-h-screen lg:pl-64">
      {/* Sidebar fijo (escritorio) */}
      <aside className="rf-hot rf-grain fixed inset-y-0 left-0 z-40 hidden w-64 border-r border-black/50 shadow-[8px_0_24px_-12px_rgba(0,0,0,0.6)] lg:block">
        {nav}
      </aside>

      {/* Barra superior (móvil) */}
      <header className="rf-hot rf-grain sticky top-0 z-30 flex items-center justify-between border-b border-black/40 px-4 py-3 lg:hidden">
        <button onClick={() => setOpen(true)} className="text-white" aria-label="Abrir menú"><Burger /></button>
        <Logo variant="dark" className="text-lg" />
        <Avatar avatar={avatar} name={username} size={32} />
      </header>

      {/* Cajón lateral (móvil) */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setOpen(false)} />
          <aside className="rf-hot rf-grain absolute inset-y-0 left-0 w-72 border-r border-black/50 shadow-2xl" style={{ animation: 'rf-drawer .25s cubic-bezier(.2,.8,.2,1) both' }}>
            {nav}
          </aside>
          <style>{`@keyframes rf-drawer{from{transform:translateX(-100%)}to{transform:translateX(0)}}`}</style>
        </div>
      )}

      {/* Contenido de la sección activa */}
      <main className="mx-auto max-w-6xl px-5 py-6 md:px-8">{children}</main>
    </div>
  )
}

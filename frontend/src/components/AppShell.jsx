import { useState } from 'react'
import Logo from './Logo'
import { LogOut, Lock, X, Flame } from './icons'
import { initials } from '../lib/ui'

const ROLE_LABELS = { superadmin: 'Super Admin', owner: 'Owner', manager: 'Manager', editor: 'Editor', viewer: 'Viewer' }
const PLAN_LABELS = { prueba: 'Prueba', basico: 'Básico (Cocinero)', pro: 'Premium', business: 'Business' }

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
export default function AppShell({ sections, active, onNavigate, username, role, plan, restaurantName, avatar, onLogout, children }) {
  const [open, setOpen] = useState(false)
  const go = (id) => { onNavigate(id); setOpen(false) }

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-5 pb-5 pt-5">
        <Logo variant="dark" className="text-xl" />
        <button className="text-white/50 hover:text-white lg:hidden" onClick={() => setOpen(false)} aria-label="Cerrar menú"><X size={20} /></button>
      </div>

      {restaurantName && (
        <div className="px-5 pb-4">
          <span className="rf-cond inline-flex max-w-full items-center gap-1.5 truncate rounded-full border border-[#ff9a3d]/25 bg-[#e8531f]/15 px-3 py-1 text-[11px] uppercase tracking-[0.14em] text-[#ffcf9e]">
            <Flame size={12} /> <span className="truncate">{restaurantName}</span>
          </span>
        </div>
      )}

      <nav className="flex-1 space-y-1 overflow-y-auto px-3">
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

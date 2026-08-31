import { useEffect, useMemo, useRef, useState } from 'react'
import Logo from './Logo'
import { authFetch, getFirstName, getAvatar, uploadAvatar } from '../auth'
import RestaurantDetail from './RestaurantDetail'
import UserManager from './UserManager'
import { greeting, capitalize, initials, Embers, StatusLamp } from '../lib/ui'
import { CURRENCY_OPTS } from '../lib/money'
import { LogOut, Plus, Search, Book, User, Cloche, Sparkle, X, Flame, Pencil } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const emptyNew = {
  name: '', code_prefix: '', tax_id: '', contact_email: '', contact_phone: '', address: '',
  currency: 'EUR', default_template: 'formal', plan: 'prueba',
  owner_mode: 'new',  // 'new' = crear dueño · 'existing' = ligar a un dueño ya existente
  owner_first_name: '', owner_last_name: '', owner_email: '', owner_phone: '', owner_role: 'owner',
}
const TEMPLATE_OPTS = [['formal', 'Formal'], ['moderna', 'Moderna'], ['tradicional', 'Tradicional'], ['llamativa', 'Llamativa']]
const PLAN_OPTS = [['prueba', 'Prueba (30 días)'], ['basico', 'Básico (Cocinero)'], ['pro', 'Premium'], ['business', 'Business']]

function AdminDashboard({
  username, recipes, canDelete, onLogout,
  selectedRestaurantId, onSelectRestaurant, onBackToRestaurants,
  onOpenRecipe, onNewRecipe, onDeleteRecipe, onDownloadPDF,
}) {
  const [restaurants, setRestaurants] = useState([])
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [showAdmins, setShowAdmins] = useState(false)
  const [nuevo, setNuevo] = useState({ ...emptyNew })
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState('')
  const [ownerCred, setOwnerCred] = useState(null) // { login, password } tras crear
  const [avatar, setAvatarState] = useState(getAvatar())
  const [uploadingAvatar, setUploadingAvatar] = useState(false)
  const avatarInputRef = useRef(null)

  const onPickAvatar = async (e) => {
    const file = e.target.files?.[0]
    e.target.value = ''
    if (!file) return
    setUploadingAvatar(true)
    try {
      const url = await uploadAvatar(file)
      setAvatarState(url)
    } catch (err) {
      setError(`No se pudo subir la foto: ${err.message}`)
    } finally {
      setUploadingAvatar(false)
    }
  }

  const loadRestaurants = async () => {
    try {
      const res = await authFetch(`${API_BASE}/restaurants/`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setRestaurants(await res.json())
    } catch (err) {
      setError(`No se pudieron cargar los restaurantes: ${err.message}`)
    }
  }

  useEffect(() => { loadRestaurants() }, [])

  const selected = restaurants.find((r) => r.id === selectedRestaurantId)

  const totals = useMemo(() => ({
    restaurants: restaurants.length,
    recipes: restaurants.reduce((s, r) => s + (r.recipe_count || 0), 0),
    users: restaurants.reduce((s, r) => s + (r.member_count || 0), 0),
  }), [restaurants])

  // Solicitudes de cambio de plan pendientes (aviso destacado arriba del todo).
  const pendingReqs = useMemo(() => restaurants.filter((r) => r.pending_plan_request), [restaurants])

  const filtered = restaurants.filter((r) =>
    !query.trim() || r.name.toLowerCase().includes(query.trim().toLowerCase()),
  )

  const createRestaurant = async (e) => {
    e.preventDefault()
    setCreating(true)
    setError('')
    try {
      const res = await authFetch(`${API_BASE}/restaurants/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...nuevo, owner_existing: nuevo.owner_mode === 'existing' }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data).flat().join(' '))
      if (data.owner_generated_password) {
        setOwnerCred({ login: nuevo.owner_email, password: data.owner_generated_password })
      }
      setNuevo({ ...emptyNew })
      setShowCreate(false)
      loadRestaurants()
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  // ── Detalle de un restaurante ──
  if (selectedRestaurantId && selected) {
    return (
      <RestaurantDetail
        restaurant={selected}
        recipes={recipes.filter((r) => r.restaurant === selected.id)}
        canDelete={canDelete}
        onBack={onBackToRestaurants}
        onUpdated={loadRestaurants}
        onOpenRecipe={onOpenRecipe}
        onNewRecipe={onNewRecipe}
        onDeleteRecipe={onDeleteRecipe}
        onDownloadPDF={onDownloadPDF}
      />
    )
  }

  return (
    <div className="rf-steel-surface min-h-screen">
      <header className="rf-hot rf-grain rf-pass-edge relative overflow-hidden">
        <Embers count={18} />
        {/* Resplandores de forja */}
        <div aria-hidden className="pointer-events-none absolute -left-28 -top-28 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(255,138,76,0.22), transparent 68%)' }} />
        <div aria-hidden className="pointer-events-none absolute right-[-6rem] top-[-4rem] h-72 w-72 rounded-full" style={{ background: 'radial-gradient(circle, rgba(232,83,31,0.16), transparent 66%)' }} />
        <div className="relative mx-auto max-w-6xl px-5 pb-28 pt-6 md:px-8">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <Logo variant="dark" className="text-2xl" />
            <div className="flex items-center gap-2.5">
              {/* Identidad del superadmin: foto (clicable para subir) + nombre + rol */}
              <input ref={avatarInputRef} type="file" accept="image/*" onChange={onPickAvatar} className="hidden" />
              <button
                onClick={() => avatarInputRef.current?.click()}
                title="Cambiar mi foto"
                className="group flex items-center gap-2.5 rounded-full border border-white/12 bg-white/[.06] py-1 pl-1 pr-3.5 backdrop-blur transition hover:bg-white/[.12]"
              >
                <span className="relative grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-[13px] font-semibold text-white">
                  {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : initials(getFirstName() || username)}
                  <span className="absolute inset-0 grid place-items-center bg-black/45 opacity-0 transition group-hover:opacity-100">
                    {uploadingAvatar
                      ? <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
                      : <Pencil size={14} className="text-white" />}
                  </span>
                </span>
                <span className="hidden text-left leading-tight sm:block">
                  <span className="block text-[13px] font-medium text-white/90">{capitalize(getFirstName() || username)}</span>
                  <span className="rf-cond block text-[10px] uppercase tracking-[0.14em] text-[#ffcf9e]">Super Admin</span>
                </span>
              </button>
              <button onClick={() => setShowAdmins(true)} className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[.06] px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/[.12]">
                <Sparkle size={15} /> <span className="hidden sm:inline">Administradores</span>
              </button>
              <button onClick={onLogout} className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[.06] px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/[.12]">
                <LogOut size={17} /> <span className="hidden sm:inline">Salir</span>
              </button>
            </div>
          </div>

          <div className="mt-12">
            <span className="rf-cond inline-flex items-center gap-1.5 rounded-full border border-[#ff9a3d]/25 bg-[#e8531f]/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.14em] text-[#ffcf9e]">
              <StatusLamp size={8} /> Panel de administración
            </span>
            <h1 className="rf-cond mt-4 text-5xl uppercase leading-[0.92] tracking-tight text-white md:text-6xl" style={{ fontWeight: 600 }}>
              {greeting()},<br /><span className="text-[#ff9a3d] drop-shadow-[0_3px_16px_rgba(232,83,31,0.5)]">{capitalize(getFirstName() || username)}</span>
            </h1>
            <p className="mt-3 max-w-md text-sm text-white/55">El puesto de mando de la plataforma: todos tus restaurantes, sus recetas y su gente.</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 md:px-8">
        {/* Clúster de instrumentos (oscuro), montado sobre el filo del pase */}
        <div className="-mt-16 grid gap-3 sm:grid-cols-3">
          <Gauge icon={<Cloche size={18} />} value={totals.restaurants} label="Restaurantes" tint="#ff6a2c" />
          <Gauge icon={<Book size={18} />} value={totals.recipes} label="Recetas totales" tint="#ff9a3d" />
          <Gauge icon={<User size={18} />} value={totals.users} label="Usuarios" tint="#d89b3a" />
        </div>

        {/* Solicitudes de cambio de plan pendientes — aviso destacado */}
        {pendingReqs.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-2xl border border-[#e8531f]/40 bg-[#fff3ea] shadow-[0_18px_44px_-24px_rgba(232,83,31,0.55)]">
            <div className="flex items-center gap-2.5 border-b border-[#e8531f]/20 bg-[#e8531f]/10 px-5 py-3">
              <span className="grid h-7 w-7 place-items-center rounded-lg bg-[#e8531f] text-white"><Flame size={15} /></span>
              <p className="rf-cond text-[15px] uppercase tracking-wide text-[#8a3d15]" style={{ fontWeight: 600 }}>
                {pendingReqs.length} solicitud{pendingReqs.length > 1 ? 'es' : ''} de cambio de plan
              </p>
            </div>
            <ul className="divide-y divide-[#e8531f]/12">
              {pendingReqs.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-[#1c1611]">{r.name}</p>
                    <p className="text-[12px] text-[#6a635c]">
                      Pide pasar a <strong className="text-[#e8531f]">{r.pending_plan_request.requested_plan_display}</strong>
                      {r.pending_plan_request.note ? ` · “${r.pending_plan_request.note}”` : ''}
                    </p>
                  </div>
                  <button onClick={() => onSelectRestaurant(r)} className="rf-ember-btn rf-cond shrink-0 rounded-lg px-3.5 py-2 text-[12px] font-600 uppercase tracking-wide text-white" style={{ fontWeight: 600 }}>
                    Revisar y aplicar
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* toolbar */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="h-4 w-1 rounded-full bg-ember" />
              <h2 className="rf-cond text-3xl uppercase tracking-[0.04em] text-[#1c1611]" style={{ fontWeight: 600 }}>Restaurantes</h2>
              <span className="rf-mono rounded-full bg-[#dfe3e7] px-2 py-0.5 text-[12px] font-medium text-[#5a5650]">{filtered.length}</span>
            </div>
            <p className="rf-mono mt-1 text-xs text-[#6a635c]">Entra a un restaurante para gestionar sus recetas y usuarios.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative sm:w-56">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9188]"><Search size={18} /></span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar restaurante…"
                className="w-full rounded-xl border border-[#b9c0c6] bg-white py-2.5 pl-10 pr-3 text-sm text-[#1c1611] shadow-[inset_0_1px_2px_rgba(20,16,8,0.07)] outline-none transition placeholder:text-[#a8a099] focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
              />
            </div>
            <button onClick={() => setShowCreate(true)} className="rf-ember-btn rf-cond flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-600 uppercase tracking-wide text-white transition hover:-translate-y-0.5" style={{ fontWeight: 600 }}>
              <Plus size={18} /> Nuevo restaurante
            </button>
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg border border-[#b03418]/25 bg-[#fbeae5] px-3 py-2 text-sm text-[#8f2c12]">{error}</p>}

        {filtered.length === 0 ? (
          <div className="rf-steel rf-edge mt-8 flex flex-col items-center rounded-3xl border border-dashed border-[#aeb6bd] py-20 text-center">
            <div className="rf-ember-btn flex h-16 w-16 items-center justify-center rounded-2xl text-white"><Cloche size={32} /></div>
            <p className="mt-4 text-lg font-bold text-[#1c1611]">Aún no hay restaurantes</p>
            <p className="mt-1 text-sm text-[#6a635c]">Crea el primero para empezar.</p>
          </div>
        ) : (
          <div className="mt-7 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r, i) => (
              <button
                key={r.id}
                onClick={() => onSelectRestaurant(r)}
                className="rf-rise group relative flex flex-col overflow-hidden rounded-[20px] border border-[#b1b9c0] rf-steel rf-edge text-left shadow-[0_14px_34px_-18px_rgba(20,16,8,0.55)] transition duration-300 hover:-translate-y-1.5 hover:border-[#e8531f]/45 hover:shadow-[0_28px_52px_-20px_rgba(20,16,8,0.7),0_0_40px_-14px_rgba(232,83,31,0.55)]"
                style={{ animationDelay: `${Math.min(i * 55, 440)}ms` }}
              >
                {/* filo de brasa que se enciende al pasar */}
                <span aria-hidden className="absolute inset-x-0 top-0 z-10 h-[3px] origin-left scale-x-0 bg-gradient-to-r from-[#ff9a3d] via-[#e8531f] to-transparent transition-transform duration-300 group-hover:scale-x-100" />
                {/* cabecera: zona caliente con monograma/logo */}
                <div className="rf-hot rf-grain relative flex h-28 items-center gap-4 overflow-hidden px-5">
                  <div aria-hidden className="pointer-events-none absolute -right-8 -top-8 h-28 w-28 rounded-full opacity-0 transition-opacity duration-300 group-hover:opacity-100" style={{ background: 'radial-gradient(circle, rgba(255,138,76,0.4), transparent 70%)' }} />
                  {r.logo ? (
                    <span className="rf-steel rf-edge relative flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#9aa2a9]/60 p-1 shadow-lg">
                      <img src={r.logo} alt={r.name} className="h-full w-full object-contain" />
                    </span>
                  ) : (
                    <span className="rf-cond relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff8a4c] to-[#c8371a] text-2xl text-white shadow-[0_8px_20px_-6px_rgba(232,83,31,0.8)]" style={{ fontWeight: 600 }}>
                      {initials(r.name)}
                    </span>
                  )}
                  <div className="relative min-w-0">
                    {r.code_prefix && (
                      <span className="rf-cell rf-cond inline-block rounded-md px-2 py-1 text-xs uppercase tracking-[0.14em] text-[#ffcf9e] shadow-sm" style={{ fontWeight: 600 }}>
                        {r.code_prefix}
                      </span>
                    )}
                  </div>
                  {r.pending_plan_request && (
                    <span className="rf-cond absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-[#d89b3a] px-2 py-0.5 text-[10px] uppercase tracking-wide text-white shadow" style={{ fontWeight: 600 }} title={`Solicita: ${r.pending_plan_request.requested_plan_display}`}>
                      <StatusLamp size={6} /> Solicitud
                    </span>
                  )}
                </div>
                {/* cuerpo */}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="rf-cond text-[22px] uppercase leading-tight tracking-[0.01em] text-[#1c1611]" style={{ fontWeight: 600 }}>{r.name}</h3>
                  <p className="mt-0.5 truncate text-xs text-[#9a9188]">{r.contact_email || 'Sin contacto'}</p>
                  <div className="mt-4 flex items-end gap-5 border-t border-[#c9d0d5] pt-3.5">
                    <div>
                      <p className="rf-cond text-[20px] leading-none text-[#1c1611]" style={{ fontWeight: 600 }}>{r.recipe_count}</p>
                      <p className="rf-mono mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[#8a837b]">recetas</p>
                    </div>
                    <div>
                      <p className="rf-cond text-[20px] leading-none text-[#1c1611]" style={{ fontWeight: 600 }}>{r.member_count}</p>
                      <p className="rf-mono mt-0.5 text-[10px] uppercase tracking-[0.12em] text-[#8a837b]">usuarios</p>
                    </div>
                    <span className="rf-cond ml-auto inline-flex items-center gap-1 self-center rounded-full bg-[#eef1f3] px-3 py-1.5 text-[11px] uppercase tracking-wide text-[#6a635c] transition group-hover:bg-ember group-hover:text-cream" style={{ fontWeight: 600 }}>
                      Gestionar <span className="transition-transform group-hover:translate-x-0.5">→</span>
                    </span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Contraseña temporal del dueño recién creado (mostrar una vez) */}
      {ownerCred && (
        <div className="fixed inset-x-0 top-4 z-[60] mx-auto flex max-w-md items-start justify-between gap-3 rounded-xl border border-[#e8531f]/40 bg-[#fff3ea] px-4 py-3 shadow-xl">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#8a3d15]">Dueño creado · «{ownerCred.login}»</p>
            <p className="mt-0.5 text-[12px] text-[#5a5650]">Comparte esta contraseña temporal; la cambiará al entrar.</p>
            <p className="rf-mono mt-1.5 select-all rounded-md bg-white px-2.5 py-1 text-[14px] font-medium text-[#1c1611]">{ownerCred.password}</p>
          </div>
          <button onClick={() => setOwnerCred(null)} className="shrink-0 text-[#9a9188] hover:text-[#5a5650]"><X size={16} /></button>
        </div>
      )}

      {/* Modal crear restaurante */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="rf-steel rf-edge flex max-h-[calc(100dvh-2rem)] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-[#aeb6bd] shadow-2xl rf-rise" onClick={(e) => e.stopPropagation()}>
            <div className="rf-hot rf-grain rf-pass-edge relative flex shrink-0 items-center justify-between px-6 py-5">
              <div>
                <h3 className="rf-cond text-lg font-600 uppercase tracking-[0.06em] text-white" style={{ fontWeight: 600 }}>Nuevo restaurante</h3>
                <p className="text-xs text-white/60">Crea el restaurante y su primer usuario de acceso.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={createRestaurant} className="space-y-4 overflow-y-auto p-6">
              {(() => { const inp = 'rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 text-sm focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20'
                const fld = (label, key, opts = {}) => (
                  <label className="flex flex-col gap-1 text-[12px] text-[#6a635c]">{label}
                    <input required={opts.required} type={opts.type || 'text'} value={nuevo[key]}
                      onChange={(e) => setNuevo({ ...nuevo, [key]: opts.upper ? e.target.value.toUpperCase() : e.target.value })}
                      className={`${inp} ${opts.mono ? 'rf-mono uppercase' : ''}`} placeholder={opts.ph || ''} maxLength={opts.maxLength} autoComplete="off" />
                  </label>
                )
                return (
                <>
                  <div>
                    <p className="rf-cond mb-2 text-xs font-600 uppercase tracking-[0.12em] text-[#7a736b]" style={{ fontWeight: 600 }}>Datos del restaurante</p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {fld('Nombre del restaurante *', 'name', { required: true, ph: 'Ceviche 103' })}
                      {fld('CIF / NIF *', 'tax_id', { required: true, ph: 'B-12345678' })}
                      {fld('Dirección *', 'address', { required: true })}
                      {fld('Teléfono *', 'contact_phone', { required: true })}
                      {fld('Correo de contacto *', 'contact_email', { required: true, type: 'email', ph: 'contacto@rest.com' })}
                      {fld('Prefijo de código *', 'code_prefix', { required: true, mono: true, upper: true, ph: 'CV103', maxLength: 12 })}
                      <label className="flex flex-col gap-1 text-[12px] text-[#6a635c]">Plantilla de fichas
                        <select value={nuevo.default_template} onChange={(e) => setNuevo({ ...nuevo, default_template: e.target.value })} className={inp}>
                          {TEMPLATE_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select></label>
                      <label className="flex flex-col gap-1 text-[12px] text-[#6a635c]">Plan de suscripción
                        <select value={nuevo.plan} onChange={(e) => setNuevo({ ...nuevo, plan: e.target.value })} className={inp}>
                          {PLAN_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select></label>
                      <label className="flex flex-col gap-1 text-[12px] text-[#6a635c]">Moneda
                        <select value={nuevo.currency} onChange={(e) => setNuevo({ ...nuevo, currency: e.target.value })} className={inp}>
                          {CURRENCY_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                        </select></label>
                    </div>
                    <p className="mt-2 text-[11px] text-[#9a9188]">El logo se sube al abrir el restaurante.</p>
                  </div>

                  <div className="rf-steel rf-edge rounded-xl border border-[#c4ccd2] p-4">
                    <p className="rf-cond mb-3 flex items-center gap-1.5 text-xs font-600 uppercase tracking-[0.12em] text-[#7a736b]" style={{ fontWeight: 600 }}><User size={13} /> Dueño del restaurante</p>
                    {/* Nuevo dueño o ligar a uno existente (2º local del mismo dueño) */}
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      {[['new', 'Dueño nuevo'], ['existing', 'Dueño existente']].map(([val, lbl]) => {
                        const on = nuevo.owner_mode === val
                        return (
                          <button key={val} type="button" onClick={() => setNuevo({ ...nuevo, owner_mode: val })}
                            className={`rf-cond rounded-lg border px-3 py-2 text-[12px] uppercase tracking-[0.06em] transition ${on ? 'border-[#e8531f] bg-[#fff3ea] text-[#8a3d15]' : 'border-[#b9c0c6] bg-white text-[#6a635c] hover:border-[#e8531f]/50'}`}
                            style={{ fontWeight: on ? 600 : 500 }}>{lbl}</button>
                        )
                      })}
                    </div>
                    {nuevo.owner_mode === 'existing' ? (
                      <>
                        {fld('Correo del dueño existente *', 'owner_email', { required: true, type: 'email', ph: 'dueno@rest.com' })}
                        <p className="mt-2 text-[11px] text-[#8a837b]">Se ligará este nuevo local al dueño con ese correo (su 2º restaurante). No se crea usuario nuevo.</p>
                      </>
                    ) : (
                      <>
                        <div className="grid gap-3 sm:grid-cols-2">
                          {fld('Nombre *', 'owner_first_name', { required: true })}
                          {fld('Apellido', 'owner_last_name', {})}
                          {fld('Correo *', 'owner_email', { required: true, type: 'email', ph: 'dueno@rest.com' })}
                          {fld('Teléfono', 'owner_phone', {})}
                        </div>
                        <label className="mt-3 flex flex-col gap-1 text-[12px] text-[#6a635c]">Rol
                          <select value={nuevo.owner_role} onChange={(e) => setNuevo({ ...nuevo, owner_role: e.target.value })} className={inp}>
                            <option value="owner">Owner (dueño: todo + gestión)</option>
                            <option value="manager">Manager (chef: crear/editar/borrar)</option>
                            <option value="editor">Editor (editar, sin crear/borrar)</option>
                            <option value="viewer">Viewer (cocina: solo consulta)</option>
                          </select></label>
                        <p className="mt-2 text-[11px] text-[#8a837b]">Se generará una contraseña temporal que el dueño cambiará al entrar.</p>
                      </>
                    )}
                  </div>
                </>
                ) })()}

              {error && <p className="rounded-lg bg-[#fbeae5] px-3 py-2 text-sm text-[#8f2c12]">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-[#b9c0c6] bg-white px-4 py-2 text-sm font-medium text-[#3a352f] hover:bg-[#f1f3f4]">Cancelar</button>
                <button type="submit" disabled={creating} className="rf-ember-btn rf-cond rounded-lg px-4 py-2 text-sm font-600 uppercase tracking-wide text-white disabled:opacity-60" style={{ fontWeight: 600 }}>
                  {creating ? 'Creando…' : 'Crear restaurante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal gestión de administradores */}
      {showAdmins && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setShowAdmins(false)}>
          <div className="rf-steel rf-edge w-full max-w-xl overflow-hidden rounded-2xl border border-[#aeb6bd] shadow-2xl rf-rise" onClick={(e) => e.stopPropagation()}>
            <div className="rf-hot rf-grain rf-pass-edge relative flex items-center justify-between px-6 py-5">
              <div>
                <h3 className="rf-cond flex items-center gap-2 text-lg font-600 uppercase tracking-[0.06em] text-white" style={{ fontWeight: 600 }}><Sparkle size={18} /> Administradores</h3>
                <p className="text-xs text-white/60">Crea o gestiona los super administradores de la plataforma.</p>
              </div>
              <button onClick={() => setShowAdmins(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto p-6">
              <UserManager admins />
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// Segmento de la tira de instrumentos (readout de fogón).
// Instrumento de fogón: gauge oscuro con número condensado grande y acento de calor.
function Gauge({ icon, value, label, tint }) {
  return (
    <div className="rf-cell relative overflow-hidden rounded-2xl border border-white/10 p-5 shadow-[0_20px_48px_-22px_rgba(0,0,0,0.75)]">
      <div aria-hidden className="pointer-events-none absolute -right-7 -top-7 h-24 w-24 rounded-full" style={{ background: `radial-gradient(circle, ${tint}38, transparent 70%)` }} />
      <span aria-hidden className="absolute inset-x-0 top-0 h-[2px]" style={{ background: `linear-gradient(90deg, ${tint}, transparent)` }} />
      <div className="relative flex items-center justify-between">
        <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/[.06] ring-1 ring-white/10" style={{ color: tint }}>{icon}</span>
        <span className="h-2 w-2 rounded-full" style={{ background: tint, boxShadow: `0 0 10px 1px ${tint}` }} />
      </div>
      <p className="rf-cond relative mt-3 text-[38px] leading-none text-white" style={{ fontWeight: 600 }}>{value}</p>
      <p className="rf-cond relative mt-1 text-[11px] uppercase tracking-[0.16em] text-white/50" style={{ fontWeight: 500 }}>{label}</p>
    </div>
  )
}

export default AdminDashboard

import { useEffect, useMemo, useState } from 'react'
import Logo from './Logo'
import { authFetch } from '../auth'
import RestaurantDetail from './RestaurantDetail'
import UserManager from './UserManager'
import { greeting, initials, Embers } from '../lib/ui'
import { LogOut, Plus, Search, Book, User, Cloche, Sparkle, X, Flame } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const emptyNew = {
  name: '', code_prefix: '', owner_username: '', owner_password: '', owner_role: 'premium',
  contact_email: '', contact_phone: '', address: '',
}

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
        body: JSON.stringify(nuevo),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(Object.values(err).flat().join(' '))
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
        <Embers count={14} />
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-6 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <Logo variant="dark" className="text-2xl" />
            <div className="flex items-center gap-2.5">
              <button onClick={() => setShowAdmins(true)} className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[.06] px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/[.12]">
                <Sparkle size={15} /> Administradores
              </button>
              <button onClick={onLogout} className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[.06] px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/[.12]">
                <LogOut size={17} /> Salir
              </button>
            </div>
          </div>

          <div className="mt-10">
            <span className="rf-cond inline-flex items-center gap-1.5 rounded-full border border-[#ff9a3d]/25 bg-[#e8531f]/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-[#ffcf9e]">
              <Flame size={13} /> Panel de administración
            </span>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
              {greeting()}, <span className="text-[#ff9a3d]">{username}</span>
            </h1>
            <p className="mt-2 text-sm text-white/55">Gestiona los restaurantes de la plataforma.</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 md:px-8">
        {/* tira de instrumentos */}
        <div className="-mt-14 grid grid-cols-3 divide-x divide-[#c4ccd2] overflow-hidden rounded-2xl border border-[#aeb6bd] rf-steel rf-edge shadow-[0_18px_44px_-20px_rgba(20,16,8,0.6)]">
          <Readout icon={<Cloche size={19} />} value={totals.restaurants} label="Restaurantes" />
          <Readout icon={<Book size={19} />} value={totals.recipes} label="Recetas totales" />
          <Readout icon={<User size={19} />} value={totals.users} label="Usuarios" />
        </div>

        {/* toolbar */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h2 className="rf-cond text-3xl font-600 uppercase tracking-[0.06em] text-[#1c1611]" style={{ fontWeight: 600 }}>Restaurantes</h2>
            <p className="rf-mono text-xs text-[#6a635c]">Entra a un restaurante para gestionar sus recetas y usuarios.</p>
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
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r, i) => (
              <button
                key={r.id}
                onClick={() => onSelectRestaurant(r)}
                className="rf-steel rf-edge rf-rise group flex flex-col overflow-hidden rounded-2xl border border-[#b1b9c0] text-left shadow-[0_12px_32px_-16px_rgba(20,16,8,0.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-18px_rgba(20,16,8,0.65)]"
                style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
              >
                {/* cabecera negra tipo rótulo de línea */}
                <div className="rf-hot rf-grain relative flex h-24 items-center gap-3.5 px-5">
                  {r.logo ? (
                    <span className="rf-steel rf-edge relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border border-[#9aa2a9]/60 p-1 shadow-md">
                      <img src={r.logo} alt={r.name} className="h-full w-full object-contain" />
                    </span>
                  ) : (
                    <span className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-xl font-bold text-white shadow-md">
                      {initials(r.name)}
                    </span>
                  )}
                  {r.code_prefix && (
                    <span className="rf-cell rf-cond relative rounded-md px-2 py-1 text-xs font-600 uppercase tracking-[0.1em] text-[#ffcf9e] shadow-sm" style={{ fontWeight: 600 }}>
                      {r.code_prefix}
                    </span>
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-xl font-bold leading-tight text-[#1c1611]">{r.name}</h3>
                  {r.contact_email && <p className="mt-1 truncate text-xs text-[#9a9188]">{r.contact_email}</p>}
                  <div className="rf-mono mt-4 flex items-center gap-4 border-t border-[#c9d0d5] pt-3 text-sm text-[#6a635c]">
                    <span className="flex items-center gap-1.5"><Book size={15} /> {r.recipe_count}</span>
                    <span className="flex items-center gap-1.5"><User size={15} /> {r.member_count}</span>
                    <span className="ml-auto text-[#b1b9c0] transition group-hover:translate-x-0.5 group-hover:text-[#e8531f]">→</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Modal crear restaurante */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="rf-steel rf-edge w-full max-w-lg overflow-hidden rounded-2xl border border-[#aeb6bd] shadow-2xl rf-rise" onClick={(e) => e.stopPropagation()}>
            <div className="rf-hot rf-grain rf-pass-edge relative flex items-center justify-between px-6 py-5">
              <div>
                <h3 className="rf-cond text-lg font-600 uppercase tracking-[0.06em] text-white" style={{ fontWeight: 600 }}>Nuevo restaurante</h3>
                <p className="text-xs text-white/60">Crea el restaurante y su primer usuario de acceso.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={createRestaurant} className="space-y-4 p-6">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="flex flex-col gap-1 text-sm text-[#3a352f]">
                  Nombre del restaurante
                  <input required value={nuevo.name} onChange={(e) => setNuevo({ ...nuevo, name: e.target.value })}
                    className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20" placeholder="Ceviche 103" />
                </label>
                <label className="flex flex-col gap-1 text-sm text-[#3a352f]">
                  Prefijo código
                  <input value={nuevo.code_prefix} onChange={(e) => setNuevo({ ...nuevo, code_prefix: e.target.value.toUpperCase() })}
                    className="rf-mono w-28 rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 uppercase focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20" placeholder="CV103" maxLength={12} />
                </label>
              </div>

              <div className="rf-steel rf-edge rounded-xl border border-[#c4ccd2] p-4">
                <p className="rf-cond mb-3 flex items-center gap-1.5 text-xs font-600 uppercase tracking-[0.12em] text-[#7a736b]" style={{ fontWeight: 600 }}><User size={13} /> Usuario de acceso</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required value={nuevo.owner_username} onChange={(e) => setNuevo({ ...nuevo, owner_username: e.target.value })}
                    className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 text-sm focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20" placeholder="Usuario" autoComplete="off" />
                  <input required type="password" value={nuevo.owner_password} onChange={(e) => setNuevo({ ...nuevo, owner_password: e.target.value })}
                    className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 text-sm focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20" placeholder="Contraseña" autoComplete="new-password" />
                </div>
                <select value={nuevo.owner_role} onChange={(e) => setNuevo({ ...nuevo, owner_role: e.target.value })}
                  className="mt-3 w-full rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 text-sm focus:border-[#e8531f] focus:outline-none">
                  <option value="premium">Premium (crear, editar y eliminar recetas)</option>
                  <option value="basic">Básico (solo ver y editar recetas)</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input value={nuevo.contact_email} onChange={(e) => setNuevo({ ...nuevo, contact_email: e.target.value })}
                  className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 text-sm focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20" placeholder="Email (opcional)" type="email" />
                <input value={nuevo.contact_phone} onChange={(e) => setNuevo({ ...nuevo, contact_phone: e.target.value })}
                  className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 text-sm focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20" placeholder="Teléfono (opcional)" />
              </div>

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
function Readout({ icon, value, label }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 sm:gap-3.5 sm:px-5 sm:py-4">
      <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2a1c14] to-[#17130f] text-[#ff9a3d] shadow-inner ring-1 ring-black/20 sm:flex">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="rf-cond text-2xl leading-none text-[#1c1611] sm:text-3xl" style={{ fontWeight: 600 }}>{value}</p>
        <p className="rf-cond mt-1 truncate text-[10px] uppercase tracking-[0.1em] text-[#7a736b] sm:text-[11px] sm:tracking-[0.14em]" style={{ fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  )
}

export default AdminDashboard

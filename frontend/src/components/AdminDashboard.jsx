import { useEffect, useMemo, useState } from 'react'
import rfLogo from '../assets/logorecipe.png'
import { authFetch } from '../auth'
import RestaurantDetail from './RestaurantDetail'
import UserManager from './UserManager'
import { greeting, initials, categoryStyle, Embers } from '../lib/ui'
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
    <div className="min-h-screen bg-[#f5f1ea]">
      <header className="rf-mesh rf-grain relative overflow-hidden">
        <Embers count={16} />
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-6 md:px-8">
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-xl bg-white/95 px-3 py-1.5 shadow-sm">
              <img src={rfLogo} alt="RecipeForge" className="h-7 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-2.5">
              <button onClick={() => setShowAdmins(true)} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20">
                <Sparkle size={15} /> Administradores
              </button>
              <button onClick={onLogout} className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20">
                <LogOut size={17} /> Salir
              </button>
            </div>
          </div>

          <div className="mt-10">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/25 bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-100">
              <Flame size={13} /> Panel de administración
            </span>
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
              {greeting()}, <span className="bg-gradient-to-r from-orange-300 to-amber-200 bg-clip-text text-transparent">{username}</span>
            </h1>
            <p className="mt-2 text-sm text-white/55">Gestiona los restaurantes de la plataforma.</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 md:px-8">
        {/* stats */}
        <div className="-mt-14 grid gap-4 sm:grid-cols-3">
          <StatCard icon={<Cloche size={20} />} tint="orange" value={totals.restaurants} label="Restaurantes" />
          <StatCard icon={<Book size={20} />} tint="violet" value={totals.recipes} label="Recetas totales" />
          <StatCard icon={<User size={20} />} tint="amber" value={totals.users} label="Usuarios" />
        </div>

        {/* toolbar */}
        <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-stone-900">Restaurantes</h2>
            <p className="text-sm text-stone-500">Entra a un restaurante para gestionar sus recetas y usuarios.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative sm:w-56">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400"><Search size={18} /></span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar restaurante…"
                className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <button onClick={() => setShowCreate(true)} className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/20 transition hover:-translate-y-0.5">
              <Plus size={18} /> Nuevo restaurante
            </button>
          </div>
        </div>

        {error && <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

        {filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-stone-300 bg-white/50 py-20 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg"><Cloche size={32} /></div>
            <p className="mt-4 text-lg font-bold text-stone-800">Aún no hay restaurantes</p>
            <p className="mt-1 text-sm text-stone-500">Crea el primero para empezar.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r, i) => {
              const cs = categoryStyle(r.name)
              return (
                <button
                  key={r.id}
                  onClick={() => onSelectRestaurant(r.id)}
                  className="rf-rise group flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white text-left shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-300/40"
                  style={{ animationDelay: `${Math.min(i * 50, 400)}ms` }}
                >
                  <div className={`relative flex h-24 items-center overflow-hidden bg-gradient-to-br ${cs.grad} px-5`}>
                    <div className="rf-grain absolute inset-0 opacity-60" />
                    {r.logo ? (
                      <span className="relative flex h-14 w-14 items-center justify-center overflow-hidden rounded-xl border-2 border-white/40 bg-white p-1 shadow-md">
                        <img src={r.logo} alt={r.name} className="h-full w-full object-contain" />
                      </span>
                    ) : (
                      <span className="relative flex h-14 w-14 items-center justify-center rounded-xl bg-white/25 text-xl font-bold text-white shadow-inner backdrop-blur">
                        {initials(r.name)}
                      </span>
                    )}
                    {r.code_prefix && (
                      <span className="relative ml-3 rounded-md bg-white/25 px-2 py-1 font-mono text-xs font-semibold text-white backdrop-blur">
                        {r.code_prefix}
                      </span>
                    )}
                  </div>
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-xl font-bold leading-tight text-stone-900">{r.name}</h3>
                    {r.contact_email && <p className="mt-1 truncate text-xs text-stone-400">{r.contact_email}</p>}
                    <div className="mt-4 flex items-center gap-4 border-t border-stone-100 pt-3 text-sm text-stone-500">
                      <span className="flex items-center gap-1.5"><Book size={15} /> {r.recipe_count} recetas</span>
                      <span className="flex items-center gap-1.5"><User size={15} /> {r.member_count} usuarios</span>
                      <span className="ml-auto text-stone-300 transition group-hover:translate-x-0.5 group-hover:text-orange-500">→</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal crear restaurante */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl rf-rise" onClick={(e) => e.stopPropagation()}>
            <div className="rf-mesh rf-grain relative flex items-center justify-between px-6 py-5">
              <div>
                <h3 className="text-lg font-bold text-white">Nuevo restaurante</h3>
                <p className="text-xs text-white/60">Crea el restaurante y su primer usuario de acceso.</p>
              </div>
              <button onClick={() => setShowCreate(false)} className="text-white/60 hover:text-white"><X size={20} /></button>
            </div>

            <form onSubmit={createRestaurant} className="space-y-4 p-6">
              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <label className="flex flex-col gap-1 text-sm text-stone-700">
                  Nombre del restaurante
                  <input required value={nuevo.name} onChange={(e) => setNuevo({ ...nuevo, name: e.target.value })}
                    className="rounded-lg border border-stone-300 px-3 py-2 focus:border-orange-400 focus:outline-none" placeholder="Ceviche 103" />
                </label>
                <label className="flex flex-col gap-1 text-sm text-stone-700">
                  Prefijo código
                  <input value={nuevo.code_prefix} onChange={(e) => setNuevo({ ...nuevo, code_prefix: e.target.value.toUpperCase() })}
                    className="w-28 rounded-lg border border-stone-300 px-3 py-2 font-mono uppercase focus:border-orange-400 focus:outline-none" placeholder="CV103" maxLength={12} />
                </label>
              </div>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="mb-3 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-stone-500"><User size={13} /> Usuario de acceso</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input required value={nuevo.owner_username} onChange={(e) => setNuevo({ ...nuevo, owner_username: e.target.value })}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none" placeholder="Usuario" autoComplete="off" />
                  <input required type="password" value={nuevo.owner_password} onChange={(e) => setNuevo({ ...nuevo, owner_password: e.target.value })}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none" placeholder="Contraseña" autoComplete="new-password" />
                </div>
                <select value={nuevo.owner_role} onChange={(e) => setNuevo({ ...nuevo, owner_role: e.target.value })}
                  className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none">
                  <option value="premium">Premium (crear, editar y eliminar recetas)</option>
                  <option value="basic">Básico (solo ver y editar recetas)</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input value={nuevo.contact_email} onChange={(e) => setNuevo({ ...nuevo, contact_email: e.target.value })}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none" placeholder="Email (opcional)" type="email" />
                <input value={nuevo.contact_phone} onChange={(e) => setNuevo({ ...nuevo, contact_phone: e.target.value })}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none" placeholder="Teléfono (opcional)" />
              </div>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button type="button" onClick={() => setShowCreate(false)} className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50">Cancelar</button>
                <button type="submit" disabled={creating} className="rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
                  {creating ? 'Creando…' : 'Crear restaurante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal gestión de administradores */}
      {showAdmins && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setShowAdmins(false)}>
          <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-white shadow-2xl rf-rise" onClick={(e) => e.stopPropagation()}>
            <div className="rf-mesh rf-grain relative flex items-center justify-between px-6 py-5">
              <div>
                <h3 className="flex items-center gap-2 text-lg font-bold text-white"><Sparkle size={18} /> Administradores</h3>
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

function StatCard({ icon, value, label, tint }) {
  const tints = {
    orange: 'from-orange-500 to-amber-500',
    violet: 'from-violet-500 to-fuchsia-500',
    amber: 'from-amber-500 to-yellow-500',
  }
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-stone-200/80 bg-white p-5 shadow-sm transition hover:shadow-md">
      <div className={`absolute -right-6 -top-6 h-20 w-20 rounded-full bg-gradient-to-br ${tints[tint]} opacity-10 blur-xl transition group-hover:opacity-20`} />
      <div className="flex items-center gap-4">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${tints[tint]} text-white shadow-sm`}>{icon}</div>
        <div>
          <p className="text-3xl font-bold leading-none text-stone-900">{value}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard

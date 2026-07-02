import { useEffect, useMemo, useState } from 'react'
import rfLogoWhite from '../assets/lockup-white-on-dark.png'
import { authFetch } from '../auth'
import RestaurantDetail from './RestaurantDetail'
import {
  LogOut, Plus, Search, Book, User, Cloche, Sparkle, ChefHat, X,
} from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const emptyNew = {
  name: '', owner_username: '', owner_password: '', owner_role: 'premium',
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

  useEffect(() => {
    loadRestaurants()
  }, [])

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

  // ── Vista de detalle de un restaurante ──
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

  // ── Lista de restaurantes ──
  return (
    <div className="min-h-screen bg-[#f7f4ef]">
      <header className="relative overflow-hidden bg-gradient-to-br from-[#1b1613] via-[#2a201a] to-[#41260f]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(234,88,12,.35), transparent 70%)' }} />
          <ChefHat size={120} className="absolute -left-6 top-6 text-white/[.04]" />
        </div>
        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-6 md:px-8">
          <div className="flex items-center justify-between">
            <img src={rfLogoWhite} alt="RecipeForge" className="h-9 w-auto object-contain" />
            <div className="flex items-center gap-3">
              <span className="hidden items-center gap-1 rounded-full bg-indigo-400/25 px-3 py-1 text-xs font-medium text-indigo-100 sm:flex">
                <Sparkle size={12} /> Super Admin
              </span>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20"
              >
                <LogOut size={17} /> Salir
              </button>
            </div>
          </div>

          <div className="mt-8">
            <p className="text-sm font-medium text-orange-200/90">Panel de administración</p>
            <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">Hola, {username} 👋</h1>
            <p className="mt-1.5 text-sm text-white/60">Gestiona los restaurantes de la plataforma.</p>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 md:px-8">
        {/* Stats */}
        <div className="-mt-10 grid gap-4 sm:grid-cols-3">
          <StatCard icon={<Cloche size={22} />} tint="orange" value={totals.restaurants} label="Restaurantes" />
          <StatCard icon={<Book size={22} />} tint="amber" value={totals.recipes} label="Recetas totales" />
          <StatCard icon={<User size={22} />} tint="indigo" value={totals.users} label="Usuarios" />
        </div>

        {/* Toolbar */}
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Restaurantes</h2>
            <p className="text-sm text-stone-500">Entra a un restaurante para gestionar sus recetas y usuarios.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative sm:w-56">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                <Search size={18} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar restaurante…"
                className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            <button
              onClick={() => setShowCreate(true)}
              className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-orange-500 hover:to-amber-400"
            >
              <Plus size={18} /> Nuevo restaurante
            </button>
          </div>
        </div>

        {error && (
          <p className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>
        )}

        {/* Grid de restaurantes */}
        {filtered.length === 0 ? (
          <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white/60 py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
              <Cloche size={34} />
            </div>
            <p className="mt-4 text-lg font-bold text-stone-800">Aún no hay restaurantes</p>
            <p className="mt-1 text-sm text-stone-500">Crea el primero para empezar.</p>
          </div>
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <button
                key={r.id}
                onClick={() => onSelectRestaurant(r.id)}
                className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg"
              >
                <div className="relative flex h-28 items-center justify-center overflow-hidden bg-gradient-to-br from-stone-800 to-stone-900">
                  {r.logo ? (
                    <img src={r.logo} alt={r.name} className="h-full w-full object-cover opacity-90" />
                  ) : (
                    <Cloche size={44} className="text-white/25" />
                  )}
                </div>
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="text-xl font-bold leading-tight text-stone-900">{r.name}</h3>
                  {r.contact_email && (
                    <p className="mt-1 truncate text-xs text-stone-400">{r.contact_email}</p>
                  )}
                  <div className="mt-4 flex items-center gap-4 border-t border-stone-100 pt-3 text-sm text-stone-500">
                    <span className="flex items-center gap-1.5"><Book size={15} /> {r.recipe_count} recetas</span>
                    <span className="flex items-center gap-1.5"><User size={15} /> {r.member_count} usuarios</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </main>

      {/* Modal crear restaurante */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={() => setShowCreate(false)}>
          <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-stone-900">Nuevo restaurante</h3>
              <button onClick={() => setShowCreate(false)} className="text-stone-400 hover:text-stone-700">
                <X size={20} />
              </button>
            </div>
            <p className="mt-1 text-sm text-stone-500">
              Crea el restaurante y su primer usuario de acceso.
            </p>

            <form onSubmit={createRestaurant} className="mt-5 space-y-4">
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Nombre del restaurante
                <input
                  required
                  value={nuevo.name}
                  onChange={(e) => setNuevo({ ...nuevo, name: e.target.value })}
                  className="rounded-lg border border-stone-300 px-3 py-2"
                  placeholder="Ceviche 103"
                />
              </label>

              <div className="rounded-xl border border-stone-200 bg-stone-50 p-4">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-stone-500">Usuario de acceso</p>
                <div className="grid gap-3 sm:grid-cols-2">
                  <input
                    required
                    value={nuevo.owner_username}
                    onChange={(e) => setNuevo({ ...nuevo, owner_username: e.target.value })}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    placeholder="Usuario"
                    autoComplete="off"
                  />
                  <input
                    required
                    type="password"
                    value={nuevo.owner_password}
                    onChange={(e) => setNuevo({ ...nuevo, owner_password: e.target.value })}
                    className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                    placeholder="Contraseña"
                    autoComplete="new-password"
                  />
                </div>
                <select
                  value={nuevo.owner_role}
                  onChange={(e) => setNuevo({ ...nuevo, owner_role: e.target.value })}
                  className="mt-3 w-full rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
                >
                  <option value="premium">Premium (crear, editar y eliminar recetas)</option>
                  <option value="basic">Básico (solo ver y editar recetas)</option>
                </select>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <input
                  value={nuevo.contact_email}
                  onChange={(e) => setNuevo({ ...nuevo, contact_email: e.target.value })}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  placeholder="Email (opcional)"
                  type="email"
                />
                <input
                  value={nuevo.contact_phone}
                  onChange={(e) => setNuevo({ ...nuevo, contact_phone: e.target.value })}
                  className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
                  placeholder="Teléfono (opcional)"
                />
              </div>

              {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="rounded-lg border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700 hover:bg-stone-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="rounded-lg bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
                >
                  {creating ? 'Creando…' : 'Crear restaurante'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function StatCard({ icon, value, label, tint }) {
  const tints = {
    orange: 'bg-orange-100 text-orange-600',
    amber: 'bg-amber-100 text-amber-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  }
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tints[tint]}`}>{icon}</div>
      <div>
        <p className="text-2xl font-bold text-stone-900">{value}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      </div>
    </div>
  )
}

export default AdminDashboard

import { useState } from 'react'
import { authFetch } from '../auth'
import UserManager from './UserManager'
import { RecipeCard } from './Dashboard'
import { Embers, initials } from '../lib/ui'
import { ArrowLeft, Book, User, Plus, Search, Cloche, Pencil } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const TABS = [
  { id: 'recipes', label: 'Recetas', icon: Book },
  { id: 'users', label: 'Usuarios', icon: User },
  { id: 'info', label: 'Información', icon: Pencil },
]

function RestaurantDetail({
  restaurant, recipes, canDelete, onBack, onUpdated,
  onOpenRecipe, onNewRecipe, onDeleteRecipe, onDownloadPDF,
}) {
  const [tab, setTab] = useState('recipes')
  const [query, setQuery] = useState('')

  const [form, setForm] = useState({
    name: restaurant.name || '',
    code_prefix: restaurant.code_prefix || '',
    contact_email: restaurant.contact_email || '',
    contact_phone: restaurant.contact_phone || '',
    address: restaurant.address || '',
  })
  const [logoFile, setLogoFile] = useState(null)
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg, setInfoMsg] = useState('')

  const filtered = recipes.filter((r) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [r.name, r.code, r.category].filter(Boolean).some((v) => v.toLowerCase().includes(q))
  })

  const saveInfo = async (e) => {
    e.preventDefault()
    setSavingInfo(true)
    setInfoMsg('')
    try {
      let res
      if (logoFile) {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => fd.append(k, v))
        fd.append('logo', logoFile)
        res = await authFetch(`${API_BASE}/restaurants/${restaurant.id}/`, { method: 'PATCH', body: fd })
      } else {
        res = await authFetch(`${API_BASE}/restaurants/${restaurant.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setInfoMsg('Información actualizada.')
      setLogoFile(null)
      onUpdated?.()
    } catch (err) {
      setInfoMsg(`No se pudo guardar: ${err.message}`)
    } finally {
      setSavingInfo(false)
    }
  }

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {/* Cabecera del restaurante */}
      <header className="rf-mesh rf-grain relative overflow-hidden">
        <Embers count={12} />
        <div className="relative mx-auto max-w-6xl px-5 py-6 md:px-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20"
          >
            <ArrowLeft size={17} /> Todos los restaurantes
          </button>

          <div className="mt-6 flex items-center gap-5">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/25 bg-white p-1.5 shadow-lg">
              {restaurant.logo ? (
                <img src={restaurant.logo} alt={restaurant.name} className="h-full w-full object-contain" />
              ) : (
                <span className="text-2xl font-bold text-stone-400">{initials(restaurant.name)}</span>
              )}
            </div>
            <div>
              <p className="flex items-center gap-1.5 text-sm font-medium text-orange-200/90">Restaurante</p>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{restaurant.name}</h1>
              <div className="mt-2 flex flex-wrap gap-4 text-sm text-white/60">
                <span className="flex items-center gap-1.5"><Book size={15} /> {recipes.length} recetas</span>
                <span className="flex items-center gap-1.5"><User size={15} /> {restaurant.member_count} usuarios</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="mt-7 flex gap-1">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 rounded-t-xl px-4 py-2.5 text-sm font-medium transition ${
                    tab === t.id ? 'bg-[#f5f1ea] text-stone-900' : 'text-white/70 hover:bg-white/10'
                  }`}
                >
                  <Icon size={16} /> {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 md:px-8">
        {/* ── RECETAS ── */}
        {tab === 'recipes' && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative sm:w-72">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                  <Search size={18} />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar receta…"
                  className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              <button
                onClick={() => onNewRecipe(restaurant.code_prefix)}
                className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-orange-500 hover:to-amber-400"
              >
                <Plus size={18} /> Nueva receta
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="mt-8 flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white/60 py-16 text-center">
                <Cloche size={40} className="text-stone-300" />
                <p className="mt-3 font-semibold text-stone-700">
                  {recipes.length === 0 ? 'Este restaurante aún no tiene recetas' : 'Sin resultados'}
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((r) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    canDelete={canDelete}
                    onEdit={() => onOpenRecipe(r.id)}
                    onDelete={() => onDeleteRecipe(r.id, r.name)}
                    onPDF={() => onDownloadPDF(r.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── USUARIOS ── */}
        {tab === 'users' && (
          <div>
            <h2 className="mb-1 text-xl font-bold text-stone-900">Usuarios del restaurante</h2>
            <p className="mb-5 text-sm text-stone-500">
              Cada usuario solo verá y gestionará las recetas de <strong>{restaurant.name}</strong>.
            </p>
            <UserManager restaurantId={restaurant.id} />
          </div>
        )}

        {/* ── INFORMACIÓN ── */}
        {tab === 'info' && (
          <form onSubmit={saveInfo} className="max-w-2xl space-y-5 rounded-2xl border border-stone-200 bg-white p-6">
            <h2 className="text-xl font-bold text-stone-900">Información de contacto</h2>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Nombre del restaurante
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-lg border border-stone-300 px-3 py-2"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Prefijo de código
                <input
                  value={form.code_prefix}
                  onChange={(e) => setForm({ ...form, code_prefix: e.target.value.toUpperCase() })}
                  className="w-28 rounded-lg border border-stone-300 px-3 py-2 font-mono uppercase"
                  placeholder="LT"
                  maxLength={12}
                />
                <span className="text-xs font-normal text-stone-400">Ej: recetas como {form.code_prefix || 'LT'}-001</span>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Email de contacto
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  className="rounded-lg border border-stone-300 px-3 py-2"
                  placeholder="contacto@restaurante.com"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Teléfono
                <input
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className="rounded-lg border border-stone-300 px-3 py-2"
                  placeholder="+51 999 999 999"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Dirección
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="rounded-lg border border-stone-300 px-3 py-2"
                placeholder="Av. Principal 123"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Logo del restaurante
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="rounded-lg border border-stone-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-stone-900 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
              />
            </label>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingInfo}
                className="rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
              >
                {savingInfo ? 'Guardando…' : 'Guardar cambios'}
              </button>
              {infoMsg && <span className="text-sm text-stone-600">{infoMsg}</span>}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

export default RestaurantDetail

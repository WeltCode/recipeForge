import { useState } from 'react'
import { authFetch } from '../auth'
import UserManager from './UserManager'
import { RecipeCard } from './Dashboard'
import { Embers, initials } from '../lib/ui'
import { TEMPLATES } from '../templates'
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
    default_template: restaurant.default_template || 'formal',
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
    <div className="rf-steel-surface min-h-screen">
      {/* Cabecera del restaurante (zona caliente) */}
      <header className="rf-hot rf-grain relative overflow-hidden">
        <Embers count={10} />
        <div className="relative mx-auto max-w-6xl px-5 py-6 md:px-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[.06] px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/[.12]"
          >
            <ArrowLeft size={17} /> Todos los restaurantes
          </button>

          <div className="mt-6 flex items-center gap-5">
            <div className="rf-steel rf-edge flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#9aa2a9]/60 p-1.5 shadow-lg">
              {restaurant.logo ? (
                <img src={restaurant.logo} alt={restaurant.name} className="h-full w-full object-contain" />
              ) : (
                <span className="text-2xl font-bold text-[#8a9098]">{initials(restaurant.name)}</span>
              )}
            </div>
            <div>
              <p className="rf-cond flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#ff9a3d]">
                Restaurante
                {restaurant.code_prefix && (
                  <span className="rf-cell rounded px-1.5 py-0.5 text-[11px] text-[#ffcf9e]">{restaurant.code_prefix}</span>
                )}
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{restaurant.name}</h1>
              <div className="rf-mono mt-2 flex flex-wrap gap-4 text-sm text-white/55">
                <span className="flex items-center gap-1.5"><Book size={15} /> {recipes.length} recetas</span>
                <span className="flex items-center gap-1.5"><User size={15} /> {restaurant.member_count} usuarios</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="rf-noscroll mt-7 flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rf-cond flex shrink-0 items-center gap-2 rounded-t-xl px-3 py-2.5 text-sm font-500 uppercase tracking-wide transition sm:px-4 ${
                    tab === t.id ? 'bg-[#dfe3e7] text-[#1c1611]' : 'text-white/70 hover:bg-white/[.08]'
                  }`}
                  style={{ fontWeight: 500 }}
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
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9188]">
                  <Search size={18} />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar receta…"
                  className="w-full rounded-xl border border-[#b9c0c6] bg-white py-2.5 pl-10 pr-3 text-sm text-[#1c1611] shadow-[inset_0_1px_2px_rgba(20,16,8,0.07)] outline-none focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                />
              </div>
              <button
                onClick={() => onNewRecipe(restaurant.code_prefix)}
                className="rf-ember-btn rf-cond flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-600 uppercase tracking-wide text-white transition hover:-translate-y-0.5"
                style={{ fontWeight: 600 }}
              >
                <Plus size={18} /> Nueva receta
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="rf-steel rf-edge mt-8 flex flex-col items-center rounded-2xl border border-dashed border-[#aeb6bd] py-16 text-center">
                <Cloche size={40} className="text-[#b1b9c0]" />
                <p className="mt-3 font-semibold text-[#3a352f]">
                  {recipes.length === 0 ? 'Este restaurante aún no tiene recetas' : 'Sin resultados'}
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((r, i) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    index={i}
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
            <h2 className="rf-cond mb-1 text-xl font-600 uppercase tracking-wide text-[#1c1611]" style={{ fontWeight: 600 }}>Usuarios del restaurante</h2>
            <p className="mb-5 text-sm text-[#6a635c]">
              Cada usuario solo verá y gestionará las recetas de <strong className="text-[#3a352f]">{restaurant.name}</strong>.
            </p>
            <UserManager restaurantId={restaurant.id} />
          </div>
        )}

        {/* ── INFORMACIÓN ── */}
        {tab === 'info' && (
          <form onSubmit={saveInfo} className="rf-steel rf-edge max-w-2xl space-y-5 rounded-2xl border border-[#c4ccd2] p-6">
            <h2 className="rf-cond text-xl font-600 uppercase tracking-wide text-[#1c1611]" style={{ fontWeight: 600 }}>Información de contacto</h2>

            <div className="grid gap-4 sm:grid-cols-[1fr_auto]">
              <label className="flex flex-col gap-1 text-sm text-[#3a352f]">
                Nombre del restaurante
                <input
                  required
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-[#3a352f]">
                Prefijo de código
                <input
                  value={form.code_prefix}
                  onChange={(e) => setForm({ ...form, code_prefix: e.target.value.toUpperCase() })}
                  className="rf-mono w-28 rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 uppercase focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20"
                  placeholder="LT"
                  maxLength={12}
                />
                <span className="text-xs font-normal text-[#9a9188]">Ej: recetas como {form.code_prefix || 'LT'}-001</span>
              </label>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-sm text-[#3a352f]">
                Email de contacto
                <input
                  type="email"
                  value={form.contact_email}
                  onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                  className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20"
                  placeholder="contacto@restaurante.com"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-[#3a352f]">
                Teléfono
                <input
                  value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20"
                  placeholder="+51 999 999 999"
                />
              </label>
            </div>
            <label className="flex flex-col gap-1 text-sm text-[#3a352f]">
              Dirección
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20"
                placeholder="Av. Principal 123"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-[#3a352f]">
              Logo del restaurante
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)}
                className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-[#17130f] file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
              />
            </label>

            <div className="flex flex-col gap-1 text-sm text-[#3a352f]">
              Plantilla por defecto de las fichas
              <div className="mt-1 grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TEMPLATES.map((t) => {
                  const active = form.default_template === t.id
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setForm({ ...form, default_template: t.id })}
                      title={t.desc}
                      className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                        active ? 'border-[#e8531f] bg-[#fff3ea] ring-2 ring-[#e8531f]/20' : 'border-[#c4ccd2] bg-white hover:border-[#9aa2a9]'
                      }`}
                    >
                      <span className={`block font-semibold ${active ? 'text-[#b5420f]' : 'text-[#3a352f]'}`}>{t.label}</span>
                      <span className="mt-0.5 block leading-tight text-[#9a9188]">{t.desc}</span>
                    </button>
                  )
                })}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="submit"
                disabled={savingInfo}
                className="rf-ember-btn rf-cond rounded-lg px-4 py-2 text-sm font-600 uppercase tracking-wide text-white disabled:opacity-60"
                style={{ fontWeight: 600 }}
              >
                {savingInfo ? 'Guardando…' : 'Guardar cambios'}
              </button>
              {infoMsg && <span className="text-sm text-[#6a635c]">{infoMsg}</span>}
            </div>
          </form>
        )}
      </main>
    </div>
  )
}

export default RestaurantDetail

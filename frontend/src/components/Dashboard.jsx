import { useMemo, useState } from 'react'
import rfLogo from '../assets/logorecipe.png'
import recipeIcon from '../assets/icon-white-256.png'
import UserManager from './UserManager'
import { greeting, initials, totalTimeLabel, Embers } from '../lib/ui'
import {
  Search, Plus, Pencil, Trash, Doc, Sparkle, Book,
  Clock, Fork, ChefHat, LogOut, Flame, Grid, List, Layers,
} from './icons'

const ROLE_META = {
  basic: { label: 'Básico', desc: 'Puedes ver y editar las fichas técnicas.', chip: 'bg-white/15 text-white ring-1 ring-white/20' },
  premium: { label: 'Premium', desc: 'Puedes crear, editar y eliminar fichas.', chip: 'bg-amber-400/20 text-amber-100 ring-1 ring-amber-300/30' },
  superadmin: { label: 'Super Admin', desc: 'Control total y gestión de usuarios.', chip: 'bg-indigo-400/20 text-indigo-100 ring-1 ring-indigo-300/30' },
}

const SORTS = {
  recientes: (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at),
  nombre: (a, b) => (a.name || '').localeCompare(b.name || ''),
  codigo: (a, b) => (a.code || '').localeCompare(b.code || ''),
}

function Dashboard({
  username, role, restaurantName, recipes, canCreate, canDelete,
  onNew, onEdit, onDelete, onDownloadPDF, onLogout,
}) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')
  const [sort, setSort] = useState('recientes')
  const [view, setView] = useState(() => localStorage.getItem('rf_view') || 'grid')
  const meta = ROLE_META[role] || ROLE_META.basic

  const setViewPersist = (v) => {
    setView(v)
    localStorage.setItem('rf_view', v)
  }

  const categories = useMemo(() => {
    const counts = {}
    for (const r of recipes) if (r.category) counts[r.category] = (counts[r.category] || 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [recipes])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = recipes.filter((r) => {
      if (cat && r.category !== cat) return false
      if (!q) return true
      return [r.name, r.code, r.category].filter(Boolean).some((v) => v.toLowerCase().includes(q))
    })
    return [...list].sort(SORTS[sort])
  }, [recipes, query, cat, sort])

  return (
    <div className="min-h-screen bg-[#f5f1ea]">
      {/* ── HERO ── */}
      <header className="rf-mesh rf-grain relative overflow-hidden">
        <Embers count={16} />
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-6 md:px-8">
          {/* barra superior */}
          <div className="flex items-center justify-between gap-3">
            <div className="rounded-xl bg-white/95 px-3 py-1.5 shadow-sm">
              <img src={rfLogo} alt="RecipeForge" className="h-7 w-auto object-contain" />
            </div>
            <div className="flex items-center gap-2.5">
              <div className="hidden items-center gap-2.5 rounded-full border border-white/15 bg-white/10 py-1.5 pl-1.5 pr-4 backdrop-blur sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-orange-500 to-amber-400 text-xs font-bold text-white">
                  {initials(username)}
                </span>
                <span className="text-sm font-medium text-white/90">{username}</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20"
              >
                <LogOut size={17} /> Salir
              </button>
            </div>
          </div>

          {/* saludo */}
          <div className="mt-10">
            {restaurantName && (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-orange-300/25 bg-orange-500/15 px-3 py-1 text-xs font-medium text-orange-100">
                <Flame size={13} /> {restaurantName}
              </span>
            )}
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
              {greeting()}, <span className="bg-gradient-to-r from-orange-300 to-amber-200 bg-clip-text text-transparent">{username}</span>
            </h1>
            <p className="mt-2 flex items-center gap-2 text-sm text-white/55">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.chip}`}>
                {role !== 'basic' && <Sparkle size={11} />} {meta.label}
              </span>
              {meta.desc}
            </p>
          </div>
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 md:px-8">
        {/* stats flotantes */}
        <div className="-mt-14 grid gap-4 sm:grid-cols-3">
          <StatCard icon={<Book size={20} />} tint="orange" value={recipes.length} label="Fichas técnicas" />
          <StatCard icon={<Layers size={20} />} tint="violet" value={categories.length} label="Categorías" />
          <StatCard icon={<Sparkle size={20} />} tint="amber" value={meta.label} label="Tu plan" small />
        </div>

        {/* toolbar */}
        <div className="mt-10 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-stone-900">Recetario</h2>
              <p className="text-sm text-stone-500">
                {filtered.length} {filtered.length === 1 ? 'ficha' : 'fichas'}
                {cat && <> en <span className="font-medium text-stone-700">{cat}</span></>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-60">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                  <Search size={18} />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar receta…"
                  className="w-full rounded-xl border border-stone-200 bg-white py-2.5 pl-10 pr-3 text-sm shadow-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
                />
              </div>
              {canCreate && (
                <button
                  onClick={onNew}
                  className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-orange-900/20 transition hover:-translate-y-0.5 hover:shadow-orange-900/30"
                >
                  <Plus size={18} /> Nueva receta
                </button>
              )}
            </div>
          </div>

          {/* filtros: categorías + orden + vista */}
          <div className="flex items-center gap-3">
            <div className="rf-noscroll flex flex-1 items-center gap-2 overflow-x-auto pb-1">
              <Chip active={!cat} onClick={() => setCat('')} label="Todas" count={recipes.length} />
              {categories.map(([c, n]) => (
                <Chip key={c} active={cat === c} onClick={() => setCat(cat === c ? '' : c)} label={c} count={n} />
              ))}
            </div>
            <div className="hidden items-center gap-2 sm:flex">
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value)}
                className="rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm text-stone-700 shadow-sm outline-none focus:border-orange-400"
              >
                <option value="recientes">Recientes</option>
                <option value="nombre">Nombre A–Z</option>
                <option value="codigo">Código</option>
              </select>
              <div className="flex rounded-lg border border-stone-200 bg-white p-0.5 shadow-sm">
                <button
                  onClick={() => setViewPersist('grid')}
                  className={`rounded-md p-1.5 transition ${view === 'grid' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-700'}`}
                  title="Cuadrícula"
                >
                  <Grid size={17} />
                </button>
                <button
                  onClick={() => setViewPersist('list')}
                  className={`rounded-md p-1.5 transition ${view === 'list' ? 'bg-stone-900 text-white' : 'text-stone-400 hover:text-stone-700'}`}
                  title="Lista"
                >
                  <List size={17} />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* recetas */}
        {filtered.length === 0 ? (
          <EmptyState hasRecipes={recipes.length > 0} query={query} cat={cat} canCreate={canCreate} onNew={onNew} />
        ) : view === 'grid' ? (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r, i) => (
              <RecipeCard key={r.id} recipe={r} index={i} canDelete={canDelete}
                onEdit={() => onEdit(r.id)} onDelete={() => onDelete(r.id, r.name)} onPDF={() => onDownloadPDF(r.id)} />
            ))}
          </div>
        ) : (
          <div className="mt-6 space-y-2.5">
            {filtered.map((r) => (
              <RecipeRow key={r.id} recipe={r} canDelete={canDelete}
                onEdit={() => onEdit(r.id)} onDelete={() => onDelete(r.id, r.name)} onPDF={() => onDownloadPDF(r.id)} />
            ))}
          </div>
        )}

        {role === 'superadmin' && <UserManager />}
      </main>
    </div>
  )
}

function Chip({ active, onClick, label, count, style }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'border-stone-900 bg-stone-900 text-white'
          : 'border-stone-200 bg-white text-stone-600 hover:border-stone-300'
      }`}
    >
      {style && <span className={`h-2 w-2 rounded-full ${active ? 'bg-white/70' : style.dot}`} />}
      {label}
      <span className={`rounded-full px-1.5 text-[10px] ${active ? 'bg-white/20' : 'bg-stone-100 text-stone-500'}`}>{count}</span>
    </button>
  )
}

function StatCard({ icon, value, label, tint, small }) {
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
          <p className={`font-bold leading-none text-stone-900 ${small ? 'text-lg' : 'text-3xl'}`}>{value}</p>
          <p className="mt-1 text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
        </div>
      </div>
    </div>
  )
}

export function RecipeCard({ recipe: r, canDelete, onEdit, onDelete, onPDF, index = 0 }) {
  return (
    <article
      className="rf-rise group flex flex-col overflow-hidden rounded-2xl border border-stone-200/80 bg-white shadow-sm transition duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-stone-300/40"
      style={{ animationDelay: `${Math.min(index * 45, 400)}ms` }}
    >
      <div className="relative h-44 overflow-hidden">
        {r.final_photo ? (
          <img src={r.final_photo} alt={r.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-110" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-400 to-stone-500">
            <img src={recipeIcon} alt="" className="h-16 w-16 object-contain opacity-80" />
          </div>
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-black/70 to-transparent" />
        {r.category && (
          <span className="absolute left-3 top-3 inline-flex items-center rounded-full bg-white/90 px-2.5 py-1 text-[11px] font-semibold text-stone-700 shadow-sm backdrop-blur">
            {r.category}
          </span>
        )}
        <span className="absolute right-3 top-3 rounded-lg bg-white/90 px-2 py-1 font-mono text-[10px] font-semibold text-stone-700 shadow-sm backdrop-blur">
          Rev. 0.{r.revision}
        </span>
        <span className="absolute bottom-2.5 left-3 rounded-md bg-black/45 px-2 py-0.5 font-mono text-[11px] font-medium text-white backdrop-blur">
          {r.code}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-base font-bold text-stone-900">{r.name}</h3>
        {r.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500">{r.description}</p>}

        <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1"><Fork size={14} /> {r.servings} rac.</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {totalTimeLabel(r)}</span>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3">
          <button onClick={onEdit} className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-700">
            <Pencil size={15} /> Abrir
          </button>
          <button onClick={onPDF} title="Descargar PDF" className="flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-700 transition hover:bg-amber-100">
            <Doc size={16} />
          </button>
          {canDelete && (
            <button onClick={onDelete} title="Eliminar" className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-red-600 transition hover:bg-red-100">
              <Trash size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function RecipeRow({ recipe: r, canDelete, onEdit, onDelete, onPDF }) {
  return (
    <div className="group flex items-center gap-4 rounded-xl border border-stone-200/80 bg-white p-2.5 pr-3 shadow-sm transition hover:shadow-md">
      <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg">
        {r.final_photo ? (
          <img src={r.final_photo} alt={r.name} className="h-full w-full object-cover" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-stone-400 to-stone-500">
            <img src={recipeIcon} alt="" className="h-7 w-7 object-contain opacity-80" />
          </div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2">
          <span className="font-mono text-[11px] text-stone-400">{r.code}</span>
          {r.category && <span className="inline-flex items-center rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-medium text-stone-600">{r.category}</span>}
        </div>
        <h3 className="line-clamp-1 text-sm font-bold text-stone-900">{r.name}</h3>
      </div>
      <div className="hidden items-center gap-4 text-xs text-stone-500 md:flex">
        <span className="flex items-center gap-1"><Fork size={14} /> {r.servings}</span>
        <span className="flex items-center gap-1"><Clock size={14} /> {totalTimeLabel(r)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onEdit} className="flex items-center gap-1.5 rounded-lg bg-stone-900 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-stone-700">
          <Pencil size={14} /> Abrir
        </button>
        <button onClick={onPDF} title="PDF" className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-1.5 text-amber-700 hover:bg-amber-100"><Doc size={15} /></button>
        {canDelete && (
          <button onClick={onDelete} title="Eliminar" className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-red-600 hover:bg-red-100"><Trash size={15} /></button>
        )}
      </div>
    </div>
  )
}

function EmptyState({ hasRecipes, query, cat, canCreate, onNew }) {
  const filtering = hasRecipes && (query || cat)
  return (
    <div className="mt-8 flex flex-col items-center rounded-3xl border border-dashed border-stone-300 bg-white/50 py-20 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-500 to-amber-500 text-white shadow-lg">
        {filtering ? <Search size={30} /> : <ChefHat size={32} />}
      </div>
      <p className="mt-4 text-lg font-bold text-stone-800">
        {filtering ? 'Sin resultados' : 'Aún no hay fichas técnicas'}
      </p>
      <p className="mt-1 max-w-xs text-sm text-stone-500">
        {filtering
          ? 'Prueba con otra búsqueda o categoría.'
          : canCreate
            ? 'Crea tu primera receta y empieza a organizar tu cocina.'
            : 'Cuando se creen recetas, aparecerán aquí.'}
      </p>
      {!filtering && canCreate && (
        <button onClick={onNew} className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-lg transition hover:-translate-y-0.5">
          <Plus size={18} /> Crear la primera receta
        </button>
      )}
    </div>
  )
}

export default Dashboard

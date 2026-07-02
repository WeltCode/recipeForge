import { useMemo, useState } from 'react'
import rfLogoWhite from '../assets/lockup-white-on-dark.png'
import UserManager from './UserManager'
import {
  Search, Plus, Pencil, Trash, Doc, Cloche, Sparkle, Book,
  Tag, Clock, Fork, ChefHat, LogOut, Flame, Whisk, Layers,
} from './icons'

const ROLE_META = {
  basic: { label: 'Básico', desc: 'Puedes ver y editar las fichas técnicas.', badge: 'bg-stone-200 text-stone-700', chip: 'bg-white/15 text-white' },
  premium: { label: 'Premium', desc: 'Puedes crear, editar y eliminar fichas.', badge: 'bg-amber-100 text-amber-800', chip: 'bg-amber-400/25 text-amber-100' },
  superadmin: { label: 'Super Admin', desc: 'Control total y gestión de usuarios.', badge: 'bg-indigo-100 text-indigo-800', chip: 'bg-indigo-400/25 text-indigo-100' },
}

function totalTimeLabel(r) {
  const toMin = (v, u) => (Number(v || 0) * (u === 'h' ? 60 : 1))
  const t = toMin(r.prep_time_value, r.prep_time_unit) + toMin(r.cook_time_value, r.cook_time_unit)
  if (!t) return '—'
  if (t >= 60) {
    const h = Math.floor(t / 60)
    const m = t % 60
    return m ? `${h}h ${m}min` : `${h}h`
  }
  return `${t} min`
}

function initials(name = '') {
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

function Dashboard({
  username, role, restaurantName, recipes, canCreate, canDelete,
  onNew, onEdit, onDelete, onDownloadPDF, onLogout,
}) {
  const [query, setQuery] = useState('')
  const meta = ROLE_META[role] || ROLE_META.basic

  const categories = useMemo(
    () => new Set(recipes.map((r) => r.category).filter(Boolean)).size,
    [recipes],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return recipes
    return recipes.filter((r) =>
      [r.name, r.code, r.category].filter(Boolean).some((v) => v.toLowerCase().includes(q)),
    )
  }, [recipes, query])

  return (
    <div className="min-h-screen bg-[#f7f4ef]">
      {/* ── HERO ── */}
      <header className="relative overflow-hidden bg-gradient-to-br from-[#1b1613] via-[#2a201a] to-[#41260f]">
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute -right-24 -top-24 h-80 w-80 rounded-full" style={{ background: 'radial-gradient(circle, rgba(234,88,12,.35), transparent 70%)' }} />
          <ChefHat size={120} className="absolute -left-6 top-6 text-white/[.04]" />
          <Whisk size={90} className="absolute right-10 bottom-2 text-white/[.05]" />
        </div>

        <div className="relative mx-auto max-w-6xl px-5 pb-16 pt-6 md:px-8">
          {/* barra superior */}
          <div className="flex items-center justify-between">
            <img src={rfLogoWhite} alt="RecipeForge" className="h-9 w-auto object-contain" />
            <button
              onClick={onLogout}
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/20"
            >
              <LogOut size={17} /> Salir
            </button>
          </div>

          {/* saludo + perfil */}
          <div className="mt-8 flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="flex items-center gap-2 text-sm font-medium text-orange-200/90">
                <Flame size={16} /> {restaurantName || 'Tu cocina, organizada'}
              </p>
              <h1 className="mt-2 text-3xl font-bold text-white md:text-4xl">
                Hola, {username} 👋
              </h1>
              <p className="mt-1.5 max-w-md text-sm text-white/60">{meta.desc}</p>
            </div>

            {/* tarjeta de perfil */}
            <div className="flex items-center gap-3 rounded-2xl border border-white/15 bg-white/10 p-3 pr-5 backdrop-blur">
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-400 text-lg font-bold text-white shadow-inner">
                {initials(username)}
              </div>
              <div>
                <p className="text-sm font-semibold text-white">{username}</p>
                <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${meta.chip}`}>
                  {role !== 'basic' && <Sparkle size={11} />} {meta.label}
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* ── CONTENIDO ── */}
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-20 md:px-8">
        {/* stats flotantes */}
        <div className="-mt-10 grid gap-4 sm:grid-cols-3">
          <StatCard icon={<Book size={22} />} tint="orange" value={recipes.length} label="Fichas técnicas" />
          <StatCard icon={<Layers size={22} />} tint="amber" value={categories} label="Categorías" />
          <StatCard icon={<Sparkle size={22} />} tint="indigo" value={meta.label} label="Tu plan" small />
        </div>

        {/* toolbar */}
        <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-xl font-bold text-stone-900">Recetas</h2>
            <p className="text-sm text-stone-500">Selecciona una ficha para verla o editarla.</p>
          </div>
          <div className="flex items-center gap-2">
            <div className="relative flex-1 sm:w-64">
              <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-stone-400">
                <Search size={18} />
              </span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar receta…"
                className="w-full rounded-xl border border-stone-300 bg-white py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-orange-400 focus:ring-2 focus:ring-orange-500/20"
              />
            </div>
            {canCreate && (
              <button
                onClick={onNew}
                className="flex shrink-0 items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-orange-900/20 transition hover:from-orange-500 hover:to-amber-400"
              >
                <Plus size={18} /> Nueva receta
              </button>
            )}
          </div>
        </div>

        {/* grid de recetas */}
        {filtered.length === 0 ? (
          <EmptyState hasRecipes={recipes.length > 0} query={query} canCreate={canCreate} onNew={onNew} />
        ) : (
          <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((r) => (
              <RecipeCard
                key={r.id}
                recipe={r}
                canDelete={canDelete}
                onEdit={() => onEdit(r.id)}
                onDelete={() => onDelete(r.id, r.name)}
                onPDF={() => onDownloadPDF(r.id)}
              />
            ))}
          </div>
        )}

        {/* gestión de usuarios (solo super admin) */}
        {role === 'superadmin' && <UserManager />}
      </main>
    </div>
  )
}

function StatCard({ icon, value, label, tint, small }) {
  const tints = {
    orange: 'bg-orange-100 text-orange-600',
    amber: 'bg-amber-100 text-amber-600',
    indigo: 'bg-indigo-100 text-indigo-600',
  }
  return (
    <div className="flex items-center gap-4 rounded-2xl border border-stone-200 bg-white p-5 shadow-sm">
      <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${tints[tint]}`}>{icon}</div>
      <div>
        <p className={`font-bold text-stone-900 ${small ? 'text-lg' : 'text-2xl'}`}>{value}</p>
        <p className="text-xs font-medium uppercase tracking-wide text-stone-500">{label}</p>
      </div>
    </div>
  )
}

export function RecipeCard({ recipe: r, canDelete, onEdit, onDelete, onPDF }) {
  return (
    <article className="group flex flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-lg">
      {/* imagen / placeholder */}
      <div className="relative h-36 overflow-hidden bg-gradient-to-br from-stone-100 to-stone-200">
        {r.final_photo ? (
          <img src={r.final_photo} alt={r.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="flex h-full w-full items-center justify-center text-stone-300">
            <Cloche size={54} />
          </div>
        )}
        <span className="absolute left-3 top-3 rounded-lg bg-black/70 px-2 py-1 font-mono text-xs font-medium text-white backdrop-blur">
          {r.code}
        </span>
        <span className="absolute right-3 top-3 rounded-lg bg-white/85 px-2 py-1 font-mono text-[11px] font-medium text-stone-700 backdrop-blur">
          Rev. 0.{r.revision}
        </span>
      </div>

      {/* cuerpo */}
      <div className="flex flex-1 flex-col p-4">
        {r.category && (
          <span className="inline-flex w-fit items-center gap-1 rounded-full bg-orange-50 px-2 py-0.5 text-[11px] font-medium text-orange-700">
            <Tag size={11} /> {r.category}
          </span>
        )}
        <h3 className="mt-2 line-clamp-1 text-base font-bold text-stone-900">{r.name}</h3>
        {r.description && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-stone-500">{r.description}</p>
        )}

        <div className="mt-3 flex items-center gap-4 text-xs text-stone-500">
          <span className="flex items-center gap-1"><Fork size={14} /> {r.servings} rac.</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {totalTimeLabel(r)}</span>
        </div>

        {/* acciones */}
        <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3">
          <button
            onClick={onEdit}
            className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-3 py-2 text-xs font-semibold text-white transition hover:bg-stone-700"
          >
            <Pencil size={15} /> Abrir
          </button>
          <button
            onClick={onPDF}
            title="Descargar PDF"
            className="flex items-center justify-center rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-2 text-amber-800 transition hover:bg-amber-100"
          >
            <Doc size={16} />
          </button>
          {canDelete && (
            <button
              onClick={onDelete}
              title="Eliminar"
              className="flex items-center justify-center rounded-lg border border-red-200 bg-red-50 px-2.5 py-2 text-red-600 transition hover:bg-red-100"
            >
              <Trash size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

function EmptyState({ hasRecipes, query, canCreate, onNew }) {
  if (hasRecipes) {
    return (
      <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white/60 py-16 text-center">
        <Search size={40} className="text-stone-300" />
        <p className="mt-3 font-semibold text-stone-700">Sin resultados</p>
        <p className="text-sm text-stone-500">No encontramos recetas para «{query}».</p>
      </div>
    )
  }
  return (
    <div className="mt-10 flex flex-col items-center rounded-2xl border border-dashed border-stone-300 bg-white/60 py-16 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-orange-100 text-orange-500">
        <ChefHat size={34} />
      </div>
      <p className="mt-4 text-lg font-bold text-stone-800">Aún no hay fichas técnicas</p>
      <p className="mt-1 max-w-xs text-sm text-stone-500">
        {canCreate
          ? 'Crea tu primera receta y empieza a organizar tu cocina.'
          : 'Cuando un usuario Premium cree recetas, aparecerán aquí.'}
      </p>
      {canCreate && (
        <button
          onClick={onNew}
          className="mt-5 flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-600 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition hover:from-orange-500 hover:to-amber-400"
        >
          <Plus size={18} /> Crear la primera receta
        </button>
      )}
    </div>
  )
}

export default Dashboard

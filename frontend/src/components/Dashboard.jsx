import { useMemo, useState } from 'react'
import { feat, getFeatures, getUsage, getPlan } from '../auth'
import recipeIconWhite from '../assets/recipeforge-icon-white.svg'
import { Search, Plus, Pencil, Doc, Trash, X, Flame, Fork, Clock, ChefHat, Sparkle } from './icons'
import { greeting, totalTimeLabel } from '../lib/ui'

const PLAN_LABELS = { prueba: 'Prueba', basico: 'Básico', pro: 'Premium', business: 'Business' }

// Rol y plan mostrados en el saludo (encabezado sobre la superficie de acero).
const ROLE_META = {
  viewer: { label: 'Viewer', desc: 'Consultas las fichas técnicas en cocina.' },
  editor: { label: 'Editor', desc: 'Puedes ver y editar las fichas técnicas.' },
  manager: { label: 'Manager', desc: 'Puedes crear, editar y eliminar fichas.' },
  owner: { label: 'Owner', desc: 'Control del restaurante y su equipo.' },
  superadmin: { label: 'Super Admin', desc: 'Control total y gestión de restaurantes.' },
}
const PLAN_META = { prueba: 'Prueba', basico: 'Básico', pro: 'Premium', business: 'Business' }

// Saludo por hora + rol + plan + descripción (se conserva como estaba antes).
function Saludo({ username, role, plan }) {
  const meta = ROLE_META[role] || ROLE_META.viewer
  const destacado = role === 'owner' || role === 'manager' || role === 'superadmin'
  return (
    <div className="mb-6">
      <h1 className="rf-cond text-3xl uppercase tracking-tight text-ink md:text-4xl" style={{ fontWeight: 600 }}>
        {greeting()}, <span className="text-ember-deep">{username}</span>
      </h1>
      <p className="mt-1.5 flex flex-wrap items-center gap-2 text-sm text-ink-2">
        <span className="pass-title inline-flex items-center gap-1 rounded-full bg-carbon px-2.5 py-0.5 text-[11px] tracking-wide text-ember-hi">
          {destacado && <Sparkle size={11} />} {meta.label}
        </span>
        {plan && (
          <span className="pass-title inline-flex items-center rounded-full border border-ember/30 bg-ember/8 px-2.5 py-0.5 text-[11px] tracking-wide text-ember-deep">
            Plan {PLAN_META[plan] || plan}
          </span>
        )}
        <span className="text-ink-3">{meta.desc}</span>
      </p>
    </div>
  )
}

// Foto de plato con fallback a zona caliente (diseño del prototipo "La Línea").
function DishPhoto({ src, alt }) {
  const [error, setError] = useState(false)
  return (
    <div className="relative aspect-[16/10] overflow-hidden bg-carbon">
      {!error && src ? (
        <img src={src} alt={alt} loading="lazy" onError={() => setError(true)} className="absolute inset-0 h-full w-full object-cover" />
      ) : (
        <div className="hot-zone absolute inset-0 flex items-center justify-center">
          <img src={recipeIconWhite} alt="" className="h-9 w-9 opacity-70" />
        </div>
      )}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-carbon/45 to-transparent" />
    </div>
  )
}

// Tarjeta de receta con el diseño del prototipo + los botones propios.
export function RecipeCard({ recipe: r, canDelete, onEdit, onDelete, onPDF }) {
  return (
    <div className="group flex flex-col overflow-hidden rounded-2xl steel-plate transition-[transform,box-shadow] duration-200 hover:-translate-y-1 hover:shadow-[0_1px_0_0_rgba(255,255,255,.8)_inset,0_18px_36px_-16px_rgba(25,28,30,.28)]">
      <div className="relative">
        <DishPhoto src={r.final_photo} alt={r.name} />
        {r.category && (
          <span className="pass-title absolute left-3 top-3 rounded-full bg-carbon/70 px-2.5 py-1 text-[11px] tracking-wide text-cream backdrop-blur">{r.category}</span>
        )}
        <span className="data absolute bottom-3 left-3 rounded bg-carbon/80 px-2 py-0.5 text-[12px] font-medium text-cream backdrop-blur">{r.code || 'FT-000'}</span>
      </div>
      <div className="flex flex-1 flex-col p-4">
        <h3 className="pass-title text-[19px] leading-tight text-ink transition-colors group-hover:text-ember-deep">{r.name}</h3>
        <div className="mt-2.5 flex items-center gap-4 text-ink-2">
          <span className="inline-flex items-center gap-1.5"><Fork size={15} className="text-ink-3" /><span className="data text-[13px]">{r.servings} rac.</span></span>
          <span className="inline-flex items-center gap-1.5"><Clock size={15} className="text-ink-3" /><span className="data text-[13px]">{totalTimeLabel(r)}</span></span>
        </div>
        <div className="mt-auto flex items-center gap-2 pt-4">
          <button onClick={onEdit} className="inline-flex h-9 flex-1 items-center justify-center gap-1.5 rounded-lg bg-soot px-3 text-[13px] font-medium text-cream transition hover:bg-carbon-2">
            <Pencil size={14} /> Abrir
          </button>
          {feat('pdf') && (
            <button onClick={onPDF} title="Descargar PDF" className="grid h-9 w-9 place-items-center rounded-lg steel-plate text-ember-deep transition hover:bg-white"><Doc size={16} /></button>
          )}
          {canDelete && (
            <button onClick={onDelete} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger transition hover:bg-danger/8"><Trash size={16} /></button>
          )}
        </div>
      </div>
    </div>
  )
}

function FiltroChip({ activo, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${
        activo ? 'bg-soot text-cream' : 'steel-plate text-ink-2 hover:text-ink'
      }`}
    >
      {children}
    </button>
  )
}

// Banner de límite de recetas del plan (barra de progreso).
function LimiteBanner({ total }) {
  const f = getFeatures()
  const usage = getUsage()
  const plan = getPlan()
  let cap = null
  let used = null
  let sufijo = ''
  if (f.max_recipes_total != null) { cap = f.max_recipes_total; used = total }
  else if (f.max_recipes_per_month != null) { cap = f.max_recipes_per_month; used = usage.recipes_this_month ?? 0; sufijo = '/mes' }
  if (cap == null) return null
  const pct = Math.min(100, Math.round((used / cap) * 100))
  const lleno = used >= cap
  return (
    <div className="steel-plate mb-6 rounded-xl p-4">
      <div className="flex items-center gap-2">
        <Flame size={16} className={lleno ? 'text-ember' : 'text-ink-3'} />
        <p className="text-[13px] text-ink">
          <span className="data font-medium">{used}</span> de <span className="data font-medium">{cap}</span> recetas{sufijo} del plan {PLAN_LABELS[plan] || plan}
        </p>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-steel-200">
        <div className={`h-full rounded-full ${lleno ? 'bg-ember' : 'bg-soot'}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

// Sección "Recetas" (contenido dentro del shell). Diseño del prototipo.
export default function Dashboard({ username, role, plan, recipes, canCreate, canDelete, onNew, onEdit, onDelete, onDownloadPDF }) {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState('todas')

  const categories = useMemo(() => {
    const counts = {}
    for (const r of recipes) if (r.category) counts[r.category] = (counts[r.category] || 0) + 1
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [recipes])

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    return recipes.filter((r) => {
      const okCat = cat === 'todas' || r.category === cat
      const okQ = !query || [r.name, r.code].filter(Boolean).some((v) => v.toLowerCase().includes(query))
      return okCat && okQ
    })
  }, [recipes, q, cat])

  return (
    <div>
      <Saludo username={username} role={role} plan={plan} />

      {/* Barra de acciones */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="steel-plate flex h-11 max-w-md flex-1 items-center gap-2 rounded-lg px-3 focus-within:border-ember/50">
          <Search size={18} className="text-ink-3" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar receta o código…" className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3" />
          {q && <button onClick={() => setQ('')} className="text-ink-3 hover:text-ink"><X size={16} /></button>}
        </div>
        {canCreate && (
          <button onClick={onNew} className="inline-flex h-11 items-center justify-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream shadow-[0_1px_0_rgba(255,255,255,.25)_inset,0_8px_20px_-8px_rgba(238,90,28,.7)] transition hover:bg-ember-hi active:translate-y-px">
            <Plus size={18} /> Nueva receta
          </button>
        )}
      </div>

      <LimiteBanner total={recipes.length} />

      {/* Filtro por categoría */}
      <div className="mb-6 flex flex-wrap gap-2">
        <FiltroChip activo={cat === 'todas'} onClick={() => setCat('todas')}>Todas <span className="data opacity-60">{recipes.length}</span></FiltroChip>
        {categories.map(([c, n]) => (
          <FiltroChip key={c} activo={cat === c} onClick={() => setCat(c)}>{c} <span className="data opacity-60">{n}</span></FiltroChip>
        ))}
      </div>

      {/* Rejilla */}
      {filtered.length ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <RecipeCard key={r.id} recipe={r} canDelete={canDelete} onEdit={() => onEdit(r.id)} onDelete={() => onDelete(r.id, r.name)} onPDF={() => onDownloadPDF(r.id)} />
          ))}
        </div>
      ) : (
        <div className="steel-plate grid place-items-center rounded-2xl py-20 text-center">
          <ChefHat size={30} className="text-ink-3" />
          <p className="pass-title mt-3 text-[20px] text-ink">{recipes.length === 0 ? 'Aún no hay fichas técnicas' : 'Sin resultados'}</p>
          <p className="mt-1 text-[14px] text-ink-2">
            {recipes.length === 0 ? (canCreate ? 'Crea tu primera receta y organiza tu cocina.' : 'Cuando se creen recetas, aparecerán aquí.') : `No hay recetas para «${q || cat}».`}
          </p>
          {recipes.length === 0 && canCreate && (
            <button onClick={onNew} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi"><Plus size={16} /> Crear la primera receta</button>
          )}
        </div>
      )}
    </div>
  )
}

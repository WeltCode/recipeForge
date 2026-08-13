import { useMemo, useState } from 'react'
import Logo from './Logo'
import recipeIcon from '../assets/recipeforge-icon-white.svg'
import UserManager from './UserManager'
import { greeting, initials, totalTimeLabel, Embers, StatusLamp } from '../lib/ui'
import {
  Search, Plus, Pencil, Trash, Doc, Sparkle, Book,
  Clock, Fork, ChefHat, LogOut, Flame, Grid, List, Layers,
} from './icons'

const ROLE_META = {
  viewer: { label: 'Viewer', desc: 'Consultas las fichas técnicas en cocina.', chip: 'bg-white/12 text-white/90 ring-1 ring-white/20' },
  editor: { label: 'Editor', desc: 'Puedes ver y editar las fichas técnicas.', chip: 'bg-white/12 text-white/90 ring-1 ring-white/20' },
  manager: { label: 'Manager', desc: 'Puedes crear, editar y eliminar fichas.', chip: 'bg-[#ff9a3d]/18 text-[#ffcf9e] ring-1 ring-[#ff9a3d]/35' },
  owner: { label: 'Owner', desc: 'Control del restaurante y su equipo.', chip: 'bg-[#e8531f]/20 text-[#ffbf9b] ring-1 ring-[#e8531f]/35' },
  superadmin: { label: 'Super Admin', desc: 'Control total y gestión de restaurantes.', chip: 'bg-[#e8531f]/20 text-[#ffbf9b] ring-1 ring-[#e8531f]/35' },
}

const PLAN_META = {
  basico: { label: 'Básico', chip: 'bg-white/12 text-white/85 ring-1 ring-white/20' },
  pro: { label: 'Pro', chip: 'bg-[#ff9a3d]/18 text-[#ffcf9e] ring-1 ring-[#ff9a3d]/35' },
  business: { label: 'Business', chip: 'bg-[#e8531f]/20 text-[#ffbf9b] ring-1 ring-[#e8531f]/35' },
}

const SORTS = {
  recientes: (a, b) => new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at),
  nombre: (a, b) => (a.name || '').localeCompare(b.name || ''),
  codigo: (a, b) => (a.code || '').localeCompare(b.code || ''),
}

function Dashboard({
  username, role, plan, restaurantName, recipes, canCreate, canDelete,
  onNew, onEdit, onDelete, onDownloadPDF, onLogout,
}) {
  const [query, setQuery] = useState('')
  const [cat, setCat] = useState('')
  const [sort, setSort] = useState('recientes')
  const [view, setView] = useState(() => localStorage.getItem('rf_view') || 'grid')
  const meta = ROLE_META[role] || ROLE_META.viewer
  const planMeta = plan ? PLAN_META[plan] : null

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
    <div className="rf-steel-surface min-h-screen">
      {/* ── ZONA CALIENTE (cabecera) ── */}
      <header className="rf-hot rf-grain rf-pass-edge relative overflow-hidden">
        <Embers count={14} />
        <div className="relative mx-auto max-w-6xl px-5 pb-24 pt-6 md:px-8">
          {/* rail superior */}
          <div className="flex items-center justify-between gap-3">
            <Logo variant="dark" className="text-2xl" />
            <div className="flex items-center gap-2.5">
              <div className="hidden items-center gap-2.5 rounded-full border border-white/12 bg-white/[.06] py-1.5 pl-1.5 pr-4 backdrop-blur sm:flex">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-xs font-bold text-white">
                  {initials(username)}
                </span>
                <span className="text-sm font-medium text-white/90">{username}</span>
              </div>
              <button
                onClick={onLogout}
                className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[.06] px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/[.12]"
              >
                <LogOut size={17} /> Salir
              </button>
            </div>
          </div>

          {/* saludo */}
          <div className="mt-10">
            {restaurantName && (
              <span className="rf-cond inline-flex items-center gap-1.5 rounded-full border border-[#ff9a3d]/25 bg-[#e8531f]/15 px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] text-[#ffcf9e]">
                <Flame size={13} /> {restaurantName}
              </span>
            )}
            <h1 className="mt-3 text-4xl font-bold tracking-tight text-white md:text-5xl">
              {greeting()}, <span className="text-[#ff9a3d]">{username}</span>
            </h1>
            <p className="mt-2 flex flex-wrap items-center gap-2 text-sm text-white/55">
              <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${meta.chip}`}>
                {(role === 'owner' || role === 'manager' || role === 'superadmin') && <Sparkle size={11} />} {meta.label}
              </span>
              {planMeta && (
                <span className={`rf-cond inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-600 uppercase tracking-wide ${planMeta.chip}`} style={{ fontWeight: 600 }}>
                  Plan {planMeta.label}
                </span>
              )}
              {meta.desc}
            </p>
          </div>
        </div>
      </header>

      {/* ── SUPERFICIE DE TRABAJO (acero) ── */}
      <main className="relative z-10 mx-auto max-w-6xl px-5 pb-24 md:px-8">
        {/* tira de instrumentos de acero */}
        <div className="-mt-14 grid grid-cols-3 divide-x divide-[#c4ccd2] overflow-hidden rounded-2xl border border-[#aeb6bd] rf-steel rf-edge shadow-[0_18px_44px_-20px_rgba(20,16,8,0.6)]">
          <Readout icon={<Book size={19} />} value={recipes.length} label="Fichas técnicas" />
          <Readout icon={<Layers size={19} />} value={categories.length} label="Categorías" />
          <Readout icon={<Sparkle size={19} />} value={planMeta ? planMeta.label : meta.label} label="Tu plan" small />
        </div>

        {/* toolbar */}
        <div className="mt-10 flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <h2 className="rf-cond text-3xl font-600 uppercase tracking-[0.06em] text-[#1c1611]" style={{ fontWeight: 600 }}>Recetario</h2>
              <p className="rf-mono text-xs text-[#6a635c]">
                {filtered.length} {filtered.length === 1 ? 'ficha' : 'fichas'}
                {cat && <> · <span className="font-medium text-[#8a3d15]">{cat}</span></>}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <div className="relative flex-1 sm:w-60">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9188]">
                  <Search size={18} />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar receta…"
                  className="w-full rounded-xl border border-[#b9c0c6] bg-white py-2.5 pl-10 pr-3 text-sm text-[#1c1611] shadow-[inset_0_1px_2px_rgba(20,16,8,0.07)] outline-none transition placeholder:text-[#a8a099] focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                />
              </div>
              {canCreate && (
                <button
                  onClick={onNew}
                  className="rf-ember-btn rf-cond flex shrink-0 items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-600 uppercase tracking-wide text-white transition hover:-translate-y-0.5"
                  style={{ fontWeight: 600 }}
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
                className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 text-sm text-[#3a352f] shadow-sm outline-none focus:border-[#e8531f]"
              >
                <option value="recientes">Recientes</option>
                <option value="nombre">Nombre A–Z</option>
                <option value="codigo">Código</option>
              </select>
              <div className="rf-steel rf-edge flex rounded-lg border border-[#b9c0c6] p-0.5 shadow-sm">
                <button
                  onClick={() => setViewPersist('grid')}
                  className={`rounded-md p-1.5 transition ${view === 'grid' ? 'rf-cell text-white' : 'text-[#7a736b] hover:text-[#3a352f]'}`}
                  title="Cuadrícula"
                >
                  <Grid size={17} />
                </button>
                <button
                  onClick={() => setViewPersist('list')}
                  className={`rounded-md p-1.5 transition ${view === 'list' ? 'rf-cell text-white' : 'text-[#7a736b] hover:text-[#3a352f]'}`}
                  title="Tablero"
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
          <div className="mt-6 overflow-hidden rounded-xl border border-[#c4ccd2] shadow-sm">
            {filtered.map((r, i) => (
              <RecipeRow key={r.id} recipe={r} index={i} canDelete={canDelete}
                onEdit={() => onEdit(r.id)} onDelete={() => onDelete(r.id, r.name)} onPDF={() => onDownloadPDF(r.id)} />
            ))}
          </div>
        )}

        {role === 'superadmin' && <UserManager />}
      </main>
    </div>
  )
}

function Chip({ active, onClick, label, count }) {
  return (
    <button
      onClick={onClick}
      className={`flex shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
        active
          ? 'rf-cell border-transparent text-white'
          : 'rf-steel rf-edge border-[#c2c9ce] text-[#5a5650] hover:border-[#9aa2a9]'
      }`}
    >
      {label}
      <span className={`rf-mono rounded-full px-1.5 text-[10px] ${active ? 'bg-white/15 text-white/80' : 'bg-black/[.06] text-[#7a736b]'}`}>{count}</span>
    </button>
  )
}

// Segmento de la tira de instrumentos: lectura tipo readout de fogón.
function Readout({ icon, value, label, small }) {
  return (
    <div className="flex items-center gap-3 px-3 py-3 sm:gap-3.5 sm:px-5 sm:py-4">
      <span className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2a1c14] to-[#17130f] text-[#ff9a3d] shadow-inner ring-1 ring-black/20 sm:flex">
        {icon}
      </span>
      <div className="min-w-0">
        <p className={`rf-cond leading-none text-[#1c1611] ${small ? 'text-lg sm:text-xl' : 'text-2xl sm:text-3xl'}`} style={{ fontWeight: 600 }}>{value}</p>
        <p className="rf-cond mt-1 truncate text-[10px] font-500 uppercase tracking-[0.1em] text-[#7a736b] sm:text-[11px] sm:tracking-[0.14em]" style={{ fontWeight: 500 }}>{label}</p>
      </div>
    </div>
  )
}

export function RecipeCard({ recipe: r, canDelete, onEdit, onDelete, onPDF, index = 0 }) {
  return (
    <article
      className="rf-steel rf-edge rf-rise group flex flex-col overflow-hidden rounded-2xl border border-[#b1b9c0] shadow-[0_12px_32px_-16px_rgba(20,16,8,0.55)] transition duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-18px_rgba(20,16,8,0.65)]"
      style={{ animationDelay: `${Math.min(index * 45, 400)}ms` }}
    >
      <div className="relative h-44 overflow-hidden bg-[#17130f]">
        {r.final_photo ? (
          <img src={r.final_photo} alt={r.name} className="h-full w-full object-cover transition duration-500 group-hover:scale-105" />
        ) : (
          <div className="rf-hot flex h-full w-full items-center justify-center">
            <img src={recipeIcon} alt="" className="h-14 w-14 object-contain opacity-70" />
          </div>
        )}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/80 to-transparent" />
        {r.category && (
          <span className="rf-steel rf-edge absolute left-3 top-3 inline-flex items-center rounded-md border border-white/40 px-2.5 py-1 text-[11px] font-semibold text-[#3a352f] shadow-sm">
            {r.category}
          </span>
        )}
        <span className="rf-mono absolute right-3 top-3 rounded-md bg-black/55 px-2 py-1 text-[10px] font-medium text-white/90 backdrop-blur">
          Rev.0.{r.revision}
        </span>
        {/* celda de código + lámpara de calor */}
        <span className="absolute bottom-3 left-3 flex items-center gap-2">
          <span className="rf-cell rf-cond inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-[13px] font-600 uppercase tracking-[0.08em] shadow-md" style={{ fontWeight: 600 }}>
            <StatusLamp on={Boolean(r.final_photo)} size={7} />
            <span className="rf-flap" style={{ animationDelay: `${Math.min(index * 45, 400)}ms` }}>{r.code}</span>
          </span>
        </span>
      </div>

      <div className="flex flex-1 flex-col p-4">
        <h3 className="line-clamp-1 text-base font-bold text-[#1c1611]">{r.name}</h3>
        {r.description && <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#6a635c]">{r.description}</p>}

        <div className="rf-mono mt-3 flex items-center gap-4 text-xs text-[#6a635c]">
          <span className="flex items-center gap-1"><Fork size={14} /> {r.servings} rac.</span>
          <span className="flex items-center gap-1"><Clock size={14} /> {totalTimeLabel(r)}</span>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-[#c9d0d5] pt-3">
          <button onClick={onEdit} className="rf-cell rf-cond flex flex-1 items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-600 uppercase tracking-wide text-white transition hover:bg-[#241a14]" style={{ fontWeight: 600 }}>
            <Pencil size={15} /> Abrir
          </button>
          <button onClick={onPDF} title="Descargar PDF" className="flex items-center justify-center rounded-lg border border-[#e8531f]/30 bg-[#fff3ea] px-2.5 py-2 text-[#b5420f] transition hover:bg-[#ffe7d6]">
            <Doc size={16} />
          </button>
          {canDelete && (
            <button onClick={onDelete} title="Eliminar" className="flex items-center justify-center rounded-lg border border-[#b03418]/25 bg-[#fbeae5] px-2.5 py-2 text-[#a4331a] transition hover:bg-[#f6d9d1]">
              <Trash size={16} />
            </button>
          )}
        </div>
      </div>
    </article>
  )
}

// Fila de tablero de pase (vista lista): celda de código negra sobre acero.
function RecipeRow({ recipe: r, canDelete, onEdit, onDelete, onPDF, index = 0 }) {
  return (
    <div className={`group flex items-center gap-4 border-b border-[#c9d0d5] px-3 py-2.5 transition last:border-b-0 ${index % 2 ? 'bg-white/45' : 'bg-white/15'} hover:bg-[#fff3ea]/70`}>
      <span className="rf-cell rf-cond inline-flex w-24 shrink-0 items-center gap-1.5 rounded-md px-2 py-1.5 text-[13px] font-600 uppercase tracking-[0.06em] shadow-sm" style={{ fontWeight: 600 }}>
        <StatusLamp on={Boolean(r.final_photo)} size={7} />
        <span className="truncate">{r.code}</span>
      </span>
      <div className="relative hidden h-11 w-11 shrink-0 overflow-hidden rounded-lg border border-[#c4ccd2] sm:block">
        {r.final_photo ? (
          <img src={r.final_photo} alt={r.name} className="h-full w-full object-cover" />
        ) : (
          <div className="rf-hot flex h-full w-full items-center justify-center"><img src={recipeIcon} alt="" className="h-6 w-6 object-contain opacity-70" /></div>
        )}
      </div>
      <div className="min-w-0 flex-1">
        <h3 className="line-clamp-1 text-sm font-bold text-[#1c1611]">{r.name}</h3>
        {r.category && <span className="text-[11px] text-[#8a3d15]">{r.category}</span>}
      </div>
      <div className="rf-mono hidden items-center gap-4 text-xs text-[#6a635c] md:flex">
        <span className="flex items-center gap-1"><Fork size={14} /> {r.servings}</span>
        <span className="flex items-center gap-1"><Clock size={14} /> {totalTimeLabel(r)}</span>
      </div>
      <div className="flex items-center gap-1.5">
        <button onClick={onEdit} className="rf-cell rf-cond flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-600 uppercase tracking-wide text-white transition hover:bg-[#241a14]" style={{ fontWeight: 600 }}>
          <Pencil size={14} /> Abrir
        </button>
        <button onClick={onPDF} title="PDF" className="rounded-lg border border-[#e8531f]/30 bg-[#fff3ea] px-2 py-1.5 text-[#b5420f] hover:bg-[#ffe7d6]"><Doc size={15} /></button>
        {canDelete && (
          <button onClick={onDelete} title="Eliminar" className="rounded-lg border border-[#b03418]/25 bg-[#fbeae5] px-2 py-1.5 text-[#a4331a] hover:bg-[#f6d9d1]"><Trash size={15} /></button>
        )}
      </div>
    </div>
  )
}

function EmptyState({ hasRecipes, query, cat, canCreate, onNew }) {
  const filtering = hasRecipes && (query || cat)
  return (
    <div className="rf-steel rf-edge mt-8 flex flex-col items-center rounded-3xl border border-dashed border-[#aeb6bd] py-20 text-center">
      <div className="rf-ember-btn flex h-16 w-16 items-center justify-center rounded-2xl text-white">
        {filtering ? <Search size={30} /> : <ChefHat size={32} />}
      </div>
      <p className="mt-4 text-lg font-bold text-[#1c1611]">
        {filtering ? 'Sin resultados' : 'Aún no hay fichas técnicas'}
      </p>
      <p className="mt-1 max-w-xs text-sm text-[#6a635c]">
        {filtering
          ? 'Prueba con otra búsqueda o categoría.'
          : canCreate
            ? 'Crea tu primera receta y empieza a organizar tu cocina.'
            : 'Cuando se creen recetas, aparecerán aquí.'}
      </p>
      {!filtering && canCreate && (
        <button onClick={onNew} className="rf-ember-btn rf-cond mt-5 flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-600 uppercase tracking-wide text-white transition hover:-translate-y-0.5" style={{ fontWeight: 600 }}>
          <Plus size={18} /> Crear la primera receta
        </button>
      )}
    </div>
  )
}

export default Dashboard

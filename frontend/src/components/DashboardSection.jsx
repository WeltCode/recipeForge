import { useEffect, useState } from 'react'
import { authFetch, getCurrency, getFirstName } from '../auth'
import { money } from '../lib/money'
import { greeting, capitalize, Embers, StatusLamp } from '../lib/ui'
import { RecipeSheet, Cloche, Coins, Inventory, Truck, Clock, Plus, ChevronRight } from './icons'

const ROLE_META = {
  viewer: { label: 'Viewer', desc: 'Consultas las fichas técnicas en cocina.' },
  editor: { label: 'Editor', desc: 'Puedes ver y editar las fichas técnicas.' },
  manager: { label: 'Manager', desc: 'Creas, editas y eliminas fichas.' },
  owner: { label: 'Owner', desc: 'Control del restaurante y su equipo.' },
  superadmin: { label: 'Super Admin', desc: 'Control total y gestión de restaurantes.' },
}
const PLAN_LABELS = { prueba: 'Prueba', basico: 'Básico (Cocinero)', pro: 'Premium', business: 'Business' }

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

// "hace 5 min" / "hace 2 h" / "hace 3 d" / fecha corta.
function ago(iso) {
  if (!iso) return ''
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000)
  if (s < 60) return 'ahora'
  if (s < 3600) return `hace ${Math.floor(s / 60)} min`
  if (s < 86400) return `hace ${Math.floor(s / 3600)} h`
  if (s < 86400 * 8) return `hace ${Math.floor(s / 86400)} d`
  return new Date(iso).toLocaleDateString('es-ES', { day: '2-digit', month: 'short' })
}

const ACTION_STYLE = {
  create: { verb: 'creó', dot: '#2f9e5f' },
  update: { verb: 'editó', dot: '#ff9a3d' },
  delete: { verb: 'borró', dot: '#c94326' },
}

// Gauge de fogón: celda de acero con número condensado grande + acento.
function Stat({ icon: Icon, value, label, sub, accent = '#e8531f', onClick, badge }) {
  const Comp = onClick ? 'button' : 'div'
  return (
    <Comp onClick={onClick} className={`group relative flex flex-col justify-between rounded-2xl steel-plate p-4 text-left transition ${onClick ? 'hover:shadow-[0_18px_44px_-24px_rgba(20,16,8,0.5)]' : ''}`}>
      <div className="flex items-start justify-between">
        <span className="grid h-9 w-9 place-items-center rounded-lg" style={{ background: `${accent}18`, color: accent }}><Icon size={19} /></span>
        {badge != null && <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: '#fbeae5', color: '#a4331a' }}>{badge}</span>}
      </div>
      <div className="mt-4">
        <div className="rf-cond leading-none text-ink" style={{ fontWeight: 600, fontSize: 34 }}>{value}</div>
        <div className="mt-1 text-[12.5px] font-medium text-ink-2">{label}</div>
        {sub && <div className="mt-0.5 text-[11.5px] text-ink-3">{sub}</div>}
      </div>
    </Comp>
  )
}

function ActionChip({ icon: Icon, children, onClick }) {
  return (
    <button onClick={onClick} className="inline-flex items-center gap-1.5 rounded-lg steel-plate px-3.5 py-2 text-[13px] font-medium text-ink transition hover:bg-white">
      <Icon size={15} className="text-ember-deep" /> {children} <ChevronRight size={13} className="text-ink-3" />
    </button>
  )
}

export default function DashboardSection({ username, role, plan, restaurantName, restaurantLogo, onNavigate, onOpenRecipe, onNewRecipe }) {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => {
    authFetch(`${API_BASE}/dashboard/`).then((r) => r.ok ? r.json() : Promise.reject(new Error('No se pudo cargar el panel.'))).then(setD).catch((e) => setError(e.message))
  }, [])

  const cur = getCurrency()
  const feat = (k) => d?.features?.[k]
  const name = capitalize(getFirstName() || username || '')
  const rm = ROLE_META[role] || ROLE_META.viewer
  const dateLabel = new Date().toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })

  return (
    <div className="pb-8">
      {/* Cabecera: saludo + rol/plan + logo del restaurante */}
      <div className="rf-hot rf-grain rf-pass-edge relative overflow-hidden rounded-2xl px-5 py-6 md:px-8 md:py-7">
        <Embers count={16} />
        <div className="relative flex items-center justify-between gap-4">
          <div className="min-w-0">
            <p className="rf-cond text-[12px] uppercase tracking-[0.2em] text-[#ffcf9e]">{greeting()} · {dateLabel}</p>
            <h1 className="rf-cond mt-1 text-3xl uppercase leading-none tracking-tight text-white md:text-[40px]" style={{ fontWeight: 600 }}>{name}</h1>
            <div className="mt-2.5 flex flex-wrap items-center gap-2">
              <span className="rf-cond inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-[11px] uppercase tracking-wide text-[#ffcf9e]"><StatusLamp size={7} /> {rm.label}</span>
              {plan && <span className="rf-cond inline-flex items-center rounded-full border border-[#ff9a3d]/40 bg-[#ff9a3d]/10 px-3 py-1 text-[11px] uppercase tracking-wide text-[#ffcf9e]">Plan {PLAN_LABELS[plan] || plan}</span>}
              <span className="hidden text-[13px] text-white/60 sm:inline">{rm.desc}</span>
            </div>
          </div>
          <div className="shrink-0 text-center">
            {restaurantLogo
              ? <img src={restaurantLogo} alt={restaurantName || ''} className="h-16 w-16 rounded-2xl object-contain md:h-20 md:w-20" style={{ background: '#fff', padding: 8, boxShadow: '0 12px 34px -14px rgba(0,0,0,.7)' }} />
              : <div className="grid h-16 w-16 place-items-center rounded-2xl md:h-20 md:w-20" style={{ border: '1px solid rgba(255,154,61,.5)', color: '#ff9a3d' }}><span className="rf-cond text-2xl" style={{ fontWeight: 600 }}>{(restaurantName || '·').slice(0, 2).toUpperCase()}</span></div>}
          </div>
        </div>
      </div>

      {/* Acciones rápidas */}
      <div className="mt-4 flex flex-wrap gap-2">
        {onNewRecipe && <button onClick={onNewRecipe} className="inline-flex items-center gap-1.5 rounded-lg bg-ember px-3.5 py-2 text-[13px] font-medium text-cream transition hover:bg-ember-hi"><Plus size={15} /> Nueva receta</button>}
        <ActionChip icon={RecipeSheet} onClick={() => onNavigate?.('recetas')}>Recetas</ActionChip>
        {feat('escandallo') && <ActionChip icon={Coins} onClick={() => onNavigate?.('escandallo')}>Escandallo</ActionChip>}
        {feat('inventory') && <ActionChip icon={Inventory} onClick={() => onNavigate?.('inventario')}>Inventario</ActionChip>}
        {feat('suppliers') && <ActionChip icon={Truck} onClick={() => onNavigate?.('proveedores')}>Proveedores</ActionChip>}
        {feat('carta') && <ActionChip icon={Cloche} onClick={() => onNavigate?.('carta')}>Carta y QR</ActionChip>}
      </div>

      {error && <p className="mt-5 rounded-xl border border-[#b03418]/25 bg-[#fbeae5] px-4 py-3 text-sm text-[#8f2c12]">{error}</p>}
      {!d && !error && <p className="mt-6 text-[13px] text-ink-3">Cargando el panel…</p>}

      {d && (
        <>
          {/* Gauges */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Stat icon={RecipeSheet} value={d.recipes.total} label="Recetas" sub={`${d.recipes.priced} con precio de venta`} onClick={() => onNavigate?.('recetas')} />
            <Stat icon={Cloche} value={d.recipes.on_menu} label="Platos en la carta" sub={d.money.menu_pvp_total ? `${money(d.money.menu_pvp_total, cur)} de PVP` : 'Aún sin precios'} accent="#c98a2e" onClick={() => onNavigate?.('carta')} />
            {feat('escandallo') && <Stat icon={Coins} value={d.costeo.escandallos} label="Escandallos" sub={d.costeo.target_food_cost_avg != null ? `Food cost objetivo ${d.costeo.target_food_cost_avg}%` : 'Sin escandallos aún'} onClick={() => onNavigate?.('escandallo')} />}
            {feat('inventory') && <Stat icon={Inventory} value={d.inventory.items} label="Insumos en inventario" sub={`${d.insumos} en el catálogo de coste`} accent="#3f9142" badge={d.inventory.low_stock ? `${d.inventory.low_stock} bajo mínimo` : null} onClick={() => onNavigate?.('inventario')} />}
            {feat('suppliers') && <Stat icon={Truck} value={d.suppliers} label="Proveedores" onClick={() => onNavigate?.('proveedores')} />}
          </div>

          <div className="mt-6 grid gap-5 lg:grid-cols-[1.3fr_1fr]">
            {/* Recetas recientes */}
            <div className="overflow-hidden rounded-2xl steel-plate">
              <div className="flex items-center justify-between border-b border-steel-200 px-4 py-3 sm:px-5">
                <p className="pass-title text-[13px] text-ink">Últimas recetas editadas</p>
                <button onClick={() => onNavigate?.('recetas')} className="text-[12px] font-medium text-ember-deep hover:underline">Ver todas →</button>
              </div>
              {d.recipes.recent.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-ink-3">Aún no hay recetas.</p>
              ) : d.recipes.recent.map((r, i) => (
                <button key={r.id} onClick={() => onOpenRecipe?.(r.id)} className={`flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white sm:px-5 ${i ? 'border-t border-steel-200' : ''}`}>
                  <span className="data shrink-0 rounded bg-[#f0ece5] px-2 py-1 text-[11px] text-ink-2">{r.code}</span>
                  <span className="min-w-0 flex-1"><span className="block truncate text-[14px] font-medium text-ink">{r.name}</span>{r.category && <span className="text-[11.5px] text-ink-3">{r.category}</span>}</span>
                  <span className="shrink-0 text-right"><span className="block text-[11.5px] text-ink-3">{ago(r.updated_at)}</span><span className="data text-[10.5px] text-ink-3">rev {r.revision}</span></span>
                </button>
              ))}
            </div>

            {/* Actividad */}
            <div className="overflow-hidden rounded-2xl steel-plate">
              <div className="flex items-center gap-2 border-b border-steel-200 px-4 py-3 sm:px-5">
                <Clock size={15} className="text-ink-3" /><p className="pass-title text-[13px] text-ink">Actividad reciente</p>
              </div>
              {d.activity.length === 0 ? (
                <p className="px-5 py-8 text-center text-[13px] text-ink-3">Sin actividad reciente todavía. Aquí verás quién crea, edita o borra recetas.</p>
              ) : d.activity.map((a, i) => {
                const st = ACTION_STYLE[a.action] || ACTION_STYLE.update
                return (
                  <div key={i} className={`flex items-start gap-3 px-4 py-2.5 sm:px-5 ${i ? 'border-t border-steel-200' : ''}`}>
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: st.dot }} />
                    <p className="flex-1 text-[13px] leading-snug text-ink-2"><span className="font-semibold text-ink">{a.user_name || 'Alguien'}</span> {st.verb} {a.entity} <span className="font-medium text-ink">«{a.entity_name}»</span></p>
                    <span className="shrink-0 text-[11px] text-ink-3">{ago(a.created_at)}</span>
                  </div>
                )
              })}
            </div>
          </div>

          {/* Por categoría */}
          {d.recipes.by_category.length > 0 && (
            <div className="mt-5 rounded-2xl steel-plate p-4 sm:p-5">
              <p className="pass-title mb-3 text-[13px] text-ink">Recetas por categoría</p>
              <div className="flex flex-wrap gap-2">
                {d.recipes.by_category.map((c) => (
                  <span key={c.category} className="inline-flex items-center gap-2 rounded-full bg-[#f0ece5] px-3 py-1.5 text-[12.5px] text-ink-2">
                    {c.category}<span className="data rounded-full bg-white px-1.5 text-[11px] font-semibold text-ember-deep">{c.n}</span>
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  )
}

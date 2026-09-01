import { useEffect, useState } from 'react'
import { authFetch, getCurrency, getFirstName } from '../auth'
import { money } from '../lib/money'
import { greeting, capitalize, Embers, StatusLamp } from '../lib/ui'
import { RecipeSheet, Cloche, Coins, Inventory, Truck, Users, Clock, Plus, ChevronRight, Flame, X } from './icons'

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

// Nombre legible de la entidad para el feed ("creó la receta «X»").
const ENTITY_LABEL = {
  receta: 'la receta',
  proveedor: 'el proveedor',
  inventario: 'el insumo',
  insumo: 'el insumo de coste',
  escandallo: 'el escandallo',
}

// Tira de avisos que requieren acción (bajo mínimo, escandallos sin precio…).
function Alert({ tone = 'warn', icon: Icon, title, detail, cta, onClick }) {
  const c = tone === 'warn'
    ? { bg: '#fff6ec', bd: 'rgba(214,138,46,.35)', ink: '#8a5410', ic: '#c98a2e' }
    : { bg: '#fbeae5', bd: 'rgba(176,52,24,.28)', ink: '#8f2c12', ic: '#c34526' }
  return (
    <button onClick={onClick} className="group flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left transition hover:brightness-[0.99]" style={{ background: c.bg, border: `1px solid ${c.bd}` }}>
      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ background: '#fff', color: c.ic }}><Icon size={17} /></span>
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-semibold" style={{ color: c.ink }}>{title}</span>
        {detail && <span className="block truncate text-[12px]" style={{ color: c.ink, opacity: 0.75 }}>{detail}</span>}
      </span>
      <span className="shrink-0 text-[12px] font-medium" style={{ color: c.ink }}>{cta} <ChevronRight size={12} className="inline" /></span>
    </button>
  )
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

// Pasos del tutorial de primer uso (tras verificar la cuenta).
const TUTORIAL_STEPS = [
  { icon: Flame, title: '¡Bienvenido a tu cocina!', desc: 'Este es tu puesto de mando. De un vistazo verás tus recetas, costes, inventario y actividad del equipo.' },
  { icon: RecipeSheet, title: 'Fichas técnicas', desc: 'Crea y estandariza tus recetas y imprímelas en A4 impecables, listas para la cocina.', nav: 'recetas' },
  { icon: Coins, title: 'Escandallo y food cost', desc: 'Calcula el coste real de cada plato, su food cost y tu margen. Toma decisiones con números.', nav: 'escandallo' },
  { icon: Cloche, title: 'Carta digital con QR', desc: 'Arma tu carta, publícala y ponla en las mesas con un código QR. Tus clientes la ven al instante.', nav: 'carta' },
  { icon: Plus, title: '¡A cocinar!', desc: 'Empieza creando tu primera receta. Estamos aquí para ayudarte cuando lo necesites.' },
]

function TutorialOverlay({ onClose, onNavigate }) {
  const [step, setStep] = useState(0)
  const s = TUTORIAL_STEPS[step]
  const last = step === TUTORIAL_STEPS.length - 1
  const Icon = s.icon
  const finish = () => { try { localStorage.removeItem('rf_onboarding') } catch { /* ignore */ } onClose() }
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-[#aeb6bd] rf-steel rf-edge shadow-2xl" style={{ animation: 'rf-tut-in .4s cubic-bezier(.2,.9,.2,1) both' }}>
        <style>{`@keyframes rf-tut-in{from{opacity:0;transform:translateY(16px) scale(.97)}to{opacity:1;transform:none}}`}</style>
        <div className="rf-hot rf-grain rf-pass-edge relative flex items-center justify-between px-5 py-3.5">
          <span className="rf-cond text-[12px] uppercase tracking-[0.16em] text-[#ffcf9e]">Tutorial · {step + 1}/{TUTORIAL_STEPS.length}</span>
          <button onClick={finish} className="text-white/60 hover:text-white" aria-label="Saltar"><X size={18} /></button>
        </div>
        <div className="px-6 py-7 text-center">
          <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-[#ff8a4c] to-[#c8371a] text-white shadow-[0_10px_26px_-8px_rgba(232,83,31,0.8)]"><Icon size={30} /></span>
          <h3 className="rf-cond mt-4 text-2xl uppercase tracking-[0.02em] text-ink" style={{ fontWeight: 600 }}>{s.title}</h3>
          <p className="mx-auto mt-2 max-w-xs text-[14px] leading-relaxed text-ink-2">{s.desc}</p>
          {s.nav && (
            <button onClick={() => { finish(); onNavigate?.(s.nav) }} className="mt-3 text-[13px] font-medium text-ember-deep hover:underline">Ver {s.title.toLowerCase()} →</button>
          )}
          {/* puntos */}
          <div className="mt-5 flex justify-center gap-1.5">
            {TUTORIAL_STEPS.map((_, k) => <span key={k} className={`h-1.5 rounded-full transition-all ${k === step ? 'w-5 bg-ember' : 'w-1.5 bg-steel-300'}`} />)}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2 border-t border-steel-200 px-5 py-3.5">
          <button onClick={finish} className="text-[13px] font-medium text-ink-3 hover:text-ink">Saltar</button>
          <div className="flex gap-2">
            {step > 0 && <button onClick={() => setStep((v) => v - 1)} className="rounded-lg border border-steel-300 bg-white px-3.5 py-2 text-[13px] font-medium text-ink-2 hover:bg-steel-100">Anterior</button>}
            <button onClick={() => (last ? finish() : setStep((v) => v + 1))} className="rounded-lg bg-ember px-4 py-2 text-[13px] font-medium text-cream hover:bg-ember-hi">{last ? 'Empezar' : 'Siguiente'}</button>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardSection({ username, role, plan, restaurantName, restaurantLogo, onNavigate, onOpenRecipe, onNewRecipe }) {
  const [d, setD] = useState(null)
  const [error, setError] = useState('')
  const [showTut, setShowTut] = useState(() => {
    try { return localStorage.getItem('rf_onboarding') === '1' } catch { return false }
  })
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
      {showTut && <TutorialOverlay onClose={() => setShowTut(false)} onNavigate={onNavigate} />}
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
          {/* Avisos que requieren acción */}
          {(() => {
            const alerts = []
            if (feat('inventory') && d.inventory.low_stock > 0) {
              const names = (d.inventory.low_names || []).join(', ')
              alerts.push(
                <Alert key="low" tone="warn" icon={Inventory}
                  title={`${d.inventory.low_stock} ${d.inventory.low_stock === 1 ? 'insumo' : 'insumos'} bajo mínimo`}
                  detail={names || undefined} cta="Reponer" onClick={() => onNavigate?.('inventario')} />
              )
            }
            if (feat('escandallo') && d.costeo.unpriced > 0) {
              alerts.push(
                <Alert key="unpriced" tone="danger" icon={Coins}
                  title={`${d.costeo.unpriced} ${d.costeo.unpriced === 1 ? 'escandallo' : 'escandallos'} sin precio de venta`}
                  detail="Fija el PVP para conocer tu margen." cta="Poner precio" onClick={() => onNavigate?.('escandallo')} />
              )
            }
            return alerts.length ? <div className="mt-4 grid gap-2 sm:grid-cols-2">{alerts}</div> : null
          })()}

          {/* Gauges */}
          <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            <Stat icon={RecipeSheet} value={d.recipes.total} label="Recetas" sub={`${d.recipes.priced} con precio de venta`} onClick={() => onNavigate?.('recetas')} />
            <Stat icon={Cloche} value={d.recipes.on_menu} label="Platos en la carta" sub={d.money.menu_pvp_total ? `${money(d.money.menu_pvp_total, cur)} de PVP` : 'Aún sin precios'} accent="#c98a2e" onClick={() => onNavigate?.('carta')} />
            {feat('escandallo') && <Stat icon={Coins} value={d.costeo.escandallos} label="Escandallos" sub={d.costeo.target_food_cost_avg != null ? `Food cost objetivo ${d.costeo.target_food_cost_avg}%` : 'Sin escandallos aún'} onClick={() => onNavigate?.('escandallo')} />}
            {feat('inventory') && <Stat icon={Inventory} value={d.inventory.items} label="Insumos en inventario" sub={`${d.insumos} en el catálogo de coste`} accent="#3f9142" badge={d.inventory.low_stock ? `${d.inventory.low_stock} bajo mínimo` : null} onClick={() => onNavigate?.('inventario')} />}
            {feat('suppliers') && <Stat icon={Truck} value={d.suppliers} label="Proveedores" onClick={() => onNavigate?.('proveedores')} />}
            {feat('multiuser') && d.team != null && <Stat icon={Users} value={d.team} label="Equipo con acceso" sub={d.team === 1 ? 'Solo tú' : 'Usuarios activos'} accent="#6b7d8c" onClick={() => onNavigate?.('equipo')} />}
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
                <p className="px-5 py-8 text-center text-[13px] text-ink-3">Sin actividad reciente todavía. Aquí verás quién crea, edita o borra recetas, insumos, escandallos, inventario y proveedores.</p>
              ) : d.activity.map((a, i) => {
                const st = ACTION_STYLE[a.action] || ACTION_STYLE.update
                const ent = ENTITY_LABEL[a.entity] || a.entity
                return (
                  <div key={i} className={`flex items-start gap-3 px-4 py-2.5 sm:px-5 ${i ? 'border-t border-steel-200' : ''}`}>
                    <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full" style={{ background: st.dot }} />
                    <p className="flex-1 text-[13px] leading-snug text-ink-2"><span className="font-semibold text-ink">{a.user_name || 'Alguien'}</span> {st.verb} {ent}{a.entity_name && <> <span className="font-medium text-ink">«{a.entity_name}»</span></>}</p>
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

import { useEffect, useState } from 'react'
import { recipeCosts, quoteCost, listProducts, UNIT_CHOICES } from '../lib/catalog'
import { Coins, Plus, Trash, X } from './icons'

// Semáforo de food cost: verde <30%, ámbar 30–40%, rojo >40%.
function foodCostColor(pct) {
  if (pct == null) return 'text-ink-3'
  const n = Number(pct)
  if (n <= 30) return 'text-ok'
  if (n <= 40) return 'text-warn'
  return 'text-danger'
}

function money(v) { return v == null ? '—' : `${Number(v).toFixed(2)} €` }

export default function EscandalloSection() {
  const [tab, setTab] = useState('recetas')
  return (
    <div className="pb-6">
      <div className="mb-6">
        <h1 className="rf-cond text-3xl uppercase tracking-tight text-ink" style={{ fontWeight: 600 }}>Escandallo</h1>
        <p className="mt-1 text-sm text-ink-2">Coste de tus recetas y cotización de insumos. Los costes salen de los productos enlazados en cada receta.</p>
      </div>
      <div className="mb-6 inline-flex rounded-lg steel-plate p-1">
        {[['recetas', 'Costes de recetas'], ['cotizacion', 'Cotización']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`h-9 rounded-md px-4 text-[13px] font-medium transition-colors ${tab === id ? 'bg-soot text-cream' : 'text-ink-2 hover:text-ink'}`}>{label}</button>
        ))}
      </div>
      {tab === 'recetas' ? <RecipeCosts /> : <Cotizacion />}
    </div>
  )
}

function RecipeCosts() {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  useEffect(() => {
    recipeCosts().then((d) => { setRows(d); setError('') }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }, [])

  if (loading) return <p className="text-sm text-ink-3">Cargando…</p>
  if (error) return <div className="rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">{error}</div>
  if (!rows.length) return (
    <div className="steel-plate grid place-items-center rounded-2xl py-16 text-center">
      <Coins size={28} className="text-ink-3" />
      <p className="pass-title mt-3 text-[18px] text-ink">Aún no hay recetas</p>
      <p className="mt-1 text-[13px] text-ink-2">Crea recetas y enlaza productos a sus ingredientes para ver sus costes.</p>
    </div>
  )
  return (
    <div className="overflow-x-auto rounded-2xl steel-plate">
      <table className="w-full min-w-[820px] border-collapse">
        <thead>
          <tr className="border-b border-steel-300 text-left text-[11px] uppercase tracking-wide text-ink-3">
            <th className="p-3">Receta</th>
            <th className="p-3 text-right">Coste total</th>
            <th className="p-3 text-right">Coste/ración</th>
            <th className="p-3 text-right">PVP</th>
            <th className="p-3 text-right">Food cost</th>
            <th className="p-3 text-right">Margen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.recipe_id} className="border-b border-steel-200 last:border-0 hover:bg-steel-50">
              <td className="p-3">
                <p className="text-[14px] font-medium text-ink">{r.name}</p>
                <p className="data text-[11px] text-ink-3">{r.code}{r.lines_missing ? ` · ${r.lines_missing} sin producto` : ''}</p>
              </td>
              <td className="p-3 text-right"><span className="data text-[13px] text-ink">{money(r.total_cost)}</span></td>
              <td className="p-3 text-right"><span className="data text-[13px] text-ink">{money(r.cost_per_serving)}</span></td>
              <td className="p-3 text-right"><span className="data text-[13px] text-ink-2">{money(r.sale_price)}</span></td>
              <td className={`p-3 text-right ${foodCostColor(r.food_cost_pct)}`}><span className="data text-[13px] font-medium">{r.food_cost_pct != null ? `${r.food_cost_pct}%` : '—'}</span></td>
              <td className="p-3 text-right"><span className="data text-[13px] text-ink">{money(r.margin)}</span></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function Cotizacion() {
  const [products, setProducts] = useState([])
  const [lines, setLines] = useState([{ product: '', quantity: '', unit: 'g' }])
  const [servings, setServings] = useState('1')
  const [salePrice, setSalePrice] = useState('')
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  useEffect(() => { listProducts().then(setProducts).catch(() => {}) }, [])

  const setLine = (i, k, v) => setLines((prev) => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l))
  const addLine = () => setLines((prev) => [...prev, { product: '', quantity: '', unit: 'g' }])
  const removeLine = (i) => setLines((prev) => prev.filter((_, idx) => idx !== i).length ? prev.filter((_, idx) => idx !== i) : [{ product: '', quantity: '', unit: 'g' }])

  const calcular = async () => {
    try {
      const body = {
        servings: Number(servings) || 1,
        sale_price: salePrice ? Number(String(salePrice).replace(',', '.')) : null,
        lines: lines.filter((l) => l.product).map((l) => ({
          product: Number(l.product),
          quantity: Number(String(l.quantity).replace(',', '.')) || 0,
          unit: l.unit,
        })),
      }
      setResult(await quoteCost(body)); setError('')
    } catch (e) { setError(e.message) }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
      <div className="rounded-2xl steel-plate p-5">
        <h2 className="pass-title mb-3 text-[16px] text-ink">Insumos</h2>
        {lines.map((l, i) => (
          <div key={i} className="mb-2 flex items-center gap-2">
            <select value={l.product} onChange={(e) => setLine(i, 'product', e.target.value)}
              className="min-w-0 flex-1 rounded-lg border border-steel-300 bg-white px-2 py-2 text-[13px] text-ink outline-none focus:border-ember/50">
              <option value="">Producto…</option>
              {products.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value.replace(/[^\d.,]/g, ''))}
              placeholder="Cant." className="w-20 rounded-lg border border-steel-300 bg-white px-2 py-2 text-[13px] text-ink outline-none focus:border-ember/50" />
            <select value={l.unit} onChange={(e) => setLine(i, 'unit', e.target.value)}
              className="w-20 rounded-lg border border-steel-300 bg-white px-2 py-2 text-[13px] text-ink outline-none focus:border-ember/50">
              {UNIT_CHOICES.map(([v]) => <option key={v} value={v}>{v}</option>)}
            </select>
            <button onClick={() => removeLine(i)} className="grid h-9 w-9 flex-none place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={15} /></button>
          </div>
        ))}
        <button onClick={addLine} className="mt-1 inline-flex items-center gap-1.5 rounded-lg steel-plate px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-white"><Plus size={15} /> Añadir insumo</button>

        <div className="mt-4 flex flex-wrap gap-3">
          <label className="flex flex-col gap-1 text-[13px] text-ink-2">Raciones
            <input value={servings} onChange={(e) => setServings(e.target.value.replace(/[^\d]/g, ''))} className="w-24 rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
          <label className="flex flex-col gap-1 text-[13px] text-ink-2">PVP por ración (€)
            <input value={salePrice} onChange={(e) => setSalePrice(e.target.value.replace(/[^\d.,]/g, ''))} className="w-32 rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" placeholder="0,00" /></label>
        </div>
        <button onClick={calcular} className="mt-4 inline-flex h-10 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi"><Coins size={16} /> Calcular</button>
        {error && <p className="mt-2 text-[13px] text-danger">{error}</p>}
      </div>

      {/* Resultado */}
      <div className="rounded-2xl hot-zone p-5 text-cream shadow-[var(--shadow-forge)]">
        <p className="pass-title text-[12px] tracking-[0.14em] text-cream-dim">Resultado</p>
        {result ? (
          <div className="mt-3 space-y-3">
            <Row label="Coste total" value={money(result.total_cost)} />
            <Row label="Coste por ración" value={money(result.cost_per_serving)} big />
            {result.food_cost_pct != null && <Row label="Food cost" value={`${result.food_cost_pct}%`} />}
            {result.margin != null && <Row label="Margen por ración" value={money(result.margin)} />}
            {result.margin_pct != null && <Row label="Margen %" value={`${result.margin_pct}%`} />}
            {result.lines_missing > 0 && <p className="text-[12px] text-cream-dim">{result.lines_missing} línea(s) sin producto no suman coste.</p>}
          </div>
        ) : (
          <p className="mt-3 text-[13px] text-cream-dim">Añade insumos y pulsa «Calcular» para ver el coste y el margen.</p>
        )}
      </div>
    </div>
  )
}

function Row({ label, value, big }) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
      <span className="text-[13px] text-cream-dim">{label}</span>
      <span className={`data font-medium text-cream ${big ? 'text-[22px]' : 'text-[15px]'}`}>{value}</span>
    </div>
  )
}

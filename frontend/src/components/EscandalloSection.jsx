import { useEffect, useMemo, useState } from 'react'
import {
  listEscandallos, createEscandallo, updateEscandallo, deleteEscandallo,
  createRecipeFromEscandallo, listProducts, listRecipes, getRecipe, UNIT_CHOICES,
} from '../lib/catalog'
import { Coins, Plus, Pencil, Trash, X, Doc } from './icons'

// Conversión de unidades para el coste en vivo (misma familia: masa/vol/ud).
const FAMILY = { kg: 'm', g: 'm', l: 'v', ml: 'v', ud: 'u' }
const TO_BASE = { kg: 1000, g: 1, l: 1000, ml: 1, ud: 1 }
function convert(qty, from, to) {
  if (FAMILY[from] !== FAMILY[to]) return null
  return (Number(qty) || 0) * TO_BASE[from] / TO_BASE[to]
}
function lineCost(product, qty, unit) {
  if (!product || product.unit_cost == null) return null
  const c = convert(qty, unit, product.base_unit)
  if (c == null) return null
  return c * Number(product.unit_cost)
}
function money(v) { return v == null ? '—' : `${Number(v).toFixed(2)} €` }
function foodCostColor(pct) {
  if (pct == null) return 'text-ink-3'
  if (pct <= 30) return 'text-ok'
  if (pct <= 40) return 'text-warn'
  return 'text-danger'
}

const EMPTY = { name: '', servings: '1', sale_price: '', notes: '', lines: [{ ingredient_name: '', product: '', quantity: '', unit: 'g' }] }

export default function EscandalloSection({ canCreateRecipe }) {
  const [rows, setRows] = useState([])
  const [products, setProducts] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | id
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [importId, setImportId] = useState('')

  const productById = useMemo(() => Object.fromEntries(products.map((p) => [String(p.id), p])), [products])

  const load = () => {
    setLoading(true)
    listEscandallos().then((d) => { setRows(d); setError('') }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])
  useEffect(() => { listProducts().then(setProducts).catch(() => {}); listRecipes().then(setRecipes).catch(() => {}) }, [])

  const openNew = () => { setForm(EMPTY); setImportId(''); setEditing('new') }
  const openEdit = (e) => {
    setForm({
      name: e.name, servings: String(e.servings), sale_price: e.sale_price != null ? String(e.sale_price) : '',
      notes: e.notes || '',
      lines: (e.lines || []).map((l) => ({ ingredient_name: l.ingredient_name, product: l.product ?? '', quantity: String(l.quantity), unit: l.unit })),
    })
    setImportId(''); setEditing(e.id)
  }
  const close = () => { setEditing(null); setForm(EMPTY) }

  const setLine = (i, k, v) => setForm((f) => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [k]: v } : l) }))
  const addLine = () => setForm((f) => ({ ...f, lines: [...f.lines, { ingredient_name: '', product: '', quantity: '', unit: 'g' }] }))
  const removeLine = (i) => setForm((f) => { const lines = f.lines.filter((_, idx) => idx !== i); return { ...f, lines: lines.length ? lines : EMPTY.lines } })

  const importFromRecipe = async (id) => {
    setImportId(id)
    if (!id) return
    try {
      const r = await getRecipe(id)
      setForm((f) => ({
        ...f,
        name: f.name || r.name,
        servings: String(r.servings || 1),
        lines: (r.ingredients || []).map((ing) => ({ ingredient_name: ing.ingredient_name, product: '', quantity: String(ing.quantity ?? ''), unit: ing.unit || 'g' })),
      }))
    } catch (e) { setError(e.message) }
  }

  // Resumen de coste en vivo.
  const summary = useMemo(() => {
    let total = 0, missing = 0
    for (const l of form.lines) {
      const p = productById[String(l.product)]
      const c = lineCost(p, l.quantity, l.unit)
      if (c == null) { if (l.ingredient_name || l.quantity) missing += 1 } else total += c
    }
    const servings = Number(form.servings) || 1
    const perServing = total / servings
    const sp = form.sale_price ? Number(String(form.sale_price).replace(',', '.')) : null
    const foodCost = sp ? (perServing / sp) * 100 : null
    const margin = sp ? sp - perServing : null
    return { total, perServing, foodCost, margin, missing }
  }, [form, productById])

  const save = async () => {
    if (!form.name.trim()) { setError('Ponle un nombre al escandallo.'); return }
    const body = {
      name: form.name, servings: Number(form.servings) || 1,
      sale_price: form.sale_price ? Number(String(form.sale_price).replace(',', '.')) : null,
      notes: form.notes,
      lines: form.lines.filter((l) => l.ingredient_name.trim() || l.product).map((l, i) => ({
        ingredient_name: l.ingredient_name, product: l.product ? Number(l.product) : null,
        quantity: Number(String(l.quantity).replace(',', '.')) || 0, unit: l.unit, order: i + 1,
      })),
    }
    setSaving(true)
    try {
      if (editing === 'new') await createEscandallo(body)
      else await updateEscandallo(editing, body)
      close(); load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  const remove = async (e) => {
    if (!window.confirm(`¿Eliminar el escandallo "${e.name}"?`)) return
    try { await deleteEscandallo(e.id); load() } catch (err) { setError(err.message) }
  }
  const toRecipe = async (e) => {
    if (!window.confirm(`Crear una receta con los ingredientes de "${e.name}"? Aparecerá en la lista de recetas.`)) return
    try { const r = await createRecipeFromEscandallo(e.id); load(); alert(`Receta creada: ${r.code} · ${r.name}`) } catch (err) { setError(err.message) }
  }

  return (
    <div className="pb-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="rf-cond text-3xl uppercase tracking-tight text-ink" style={{ fontWeight: 600 }}>Escandallo</h1>
          <p className="mt-1 text-sm text-ink-2">Coste de tus platos. Crea uno desde cero, pártelo de una receta existente, o genera una receta a partir de sus insumos.</p>
        </div>
        <button onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream shadow-[0_8px_20px_-8px_rgba(238,90,28,.7)] transition hover:bg-ember-hi">
          <Plus size={18} /> Nuevo escandallo
        </button>
      </div>

      {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">{error}</div>}

      {/* Formulario */}
      {editing && (
        <div className="mb-6 rounded-2xl steel-plate p-5">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="pass-title text-[16px] text-ink">{editing === 'new' ? 'Nuevo escandallo' : 'Editar escandallo'}</h2>
            <button onClick={close} className="text-ink-3 hover:text-ink"><X size={18} /></button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <label className="flex flex-col gap-1 text-[13px] text-ink-2 sm:col-span-2">Nombre del plato *
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">Raciones
              <input value={form.servings} onChange={(e) => setForm({ ...form, servings: e.target.value.replace(/[^\d]/g, '') })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">PVP por ración (€)
              <input value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value.replace(/[^\d.,]/g, '') })} placeholder="0,00" className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
          </div>

          {editing === 'new' && recipes.length > 0 && (
            <label className="mt-3 flex flex-wrap items-center gap-2 text-[13px] text-ink-2">
              Partir de una receta:
              <select value={importId} onChange={(e) => importFromRecipe(e.target.value)} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                <option value="">— ninguna —</option>
                {recipes.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
              </select>
              <span className="text-ink-3">importa sus ingredientes para costearlos</span>
            </label>
          )}

          {/* Líneas de insumo */}
          <div className="mt-4">
            <p className="pass-title mb-2 text-[13px] text-ink">Insumos</p>
            {/* Cabecera de columnas */}
            <div className="mb-1 hidden grid-cols-[1fr_160px_70px_60px_70px_36px] gap-2 px-0.5 text-[10px] uppercase tracking-wide text-ink-3 sm:grid">
              <span>Insumo</span><span>Producto (proveedor)</span><span>Cant.</span><span>Unidad</span><span className="text-right">Coste</span><span />
            </div>
            {form.lines.map((l, i) => {
              const p = productById[String(l.product)]
              const c = lineCost(p, l.quantity, l.unit)
              const pickProduct = (val) => {
                const prod = productById[String(val)]
                setForm((f) => ({ ...f, lines: f.lines.map((ln, idx) => idx === i ? { ...ln, product: val, ingredient_name: ln.ingredient_name || (prod ? prod.name : ''), unit: prod ? prod.base_unit : ln.unit } : ln) }))
              }
              return (
                <div key={i} className="mb-2">
                  <div className="flex flex-wrap items-center gap-2 sm:grid sm:grid-cols-[1fr_160px_70px_60px_70px_36px]">
                    <input value={l.ingredient_name} onChange={(e) => setLine(i, 'ingredient_name', e.target.value)} placeholder="Insumo" className="min-w-[120px] flex-1 rounded-lg border border-steel-300 bg-white px-2.5 py-2 text-[13px] text-ink outline-none focus:border-ember/50" />
                    <select value={l.product} onChange={(e) => pickProduct(e.target.value)} className="min-w-[130px] rounded-lg border border-steel-300 bg-white px-2 py-2 text-[13px] text-ink outline-none focus:border-ember/50">
                      <option value="">Producto…</option>
                      {products.map((pr) => <option key={pr.id} value={pr.id}>{pr.name}</option>)}
                    </select>
                    <input value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Cant." className="w-20 rounded-lg border border-steel-300 bg-white px-2 py-2 text-[13px] text-ink outline-none focus:border-ember/50" />
                    <select value={l.unit} onChange={(e) => setLine(i, 'unit', e.target.value)} className="w-[70px] rounded-lg border border-steel-300 bg-white px-1.5 py-2 text-[13px] text-ink outline-none focus:border-ember/50">
                      {UNIT_CHOICES.map(([v]) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <span className="data w-16 text-right text-[12px] text-ink-2 sm:w-auto">{c == null ? '—' : money(c)}</span>
                    <button onClick={() => removeLine(i)} className="grid h-9 w-9 flex-none place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={15} /></button>
                  </div>
                  {p && (
                    <p className="mt-0.5 pl-0.5 text-[11px] text-ink-3">
                      {p.supplier_name ? `${p.supplier_name} · ` : ''}
                      {p.unit_cost != null ? <span className="data">{p.unit_cost} €/{p.base_unit}</span> : 'sin coste'}
                    </p>
                  )}
                </div>
              )
            })}
            <button onClick={addLine} className="mt-1 inline-flex items-center gap-1.5 rounded-lg steel-plate px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-white"><Plus size={15} /> Añadir insumo</button>
          </div>

          {/* Resumen en vivo */}
          <div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-steel-200/50 p-3 sm:grid-cols-4">
            <Stat label="Coste total" value={money(summary.total)} />
            <Stat label="Coste/ración" value={money(summary.perServing)} />
            <Stat label="Food cost" value={summary.foodCost != null ? `${summary.foodCost.toFixed(2)}%` : '—'} color={foodCostColor(summary.foodCost)} />
            <Stat label="Margen/ración" value={money(summary.margin)} />
          </div>
          {summary.missing > 0 && <p className="mt-2 text-[12px] text-ink-3">{summary.missing} insumo(s) sin producto no suman coste.</p>}

          <div className="mt-4 flex gap-2">
            <button disabled={saving} onClick={save} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar escandallo'}</button>
            <button onClick={close} className="inline-flex h-10 items-center rounded-lg steel-plate px-4 text-sm font-medium text-ink hover:bg-white">Cancelar</button>
          </div>
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <p className="text-sm text-ink-3">Cargando…</p>
      ) : rows.length ? (
        <div className="overflow-x-auto rounded-2xl steel-plate">
          <table className="w-full min-w-[820px] border-collapse">
            <thead>
              <tr className="border-b border-steel-300 text-left text-[11px] uppercase tracking-wide text-ink-3">
                <th className="p-3">Plato</th>
                <th className="p-3 text-right">Coste total</th>
                <th className="p-3 text-right">Coste/ración</th>
                <th className="p-3 text-right">PVP</th>
                <th className="p-3 text-right">Food cost</th>
                <th className="p-3 text-right">Margen</th>
                <th className="p-3 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const s = e.summary || {}
                return (
                  <tr key={e.id} className="border-b border-steel-200 last:border-0 hover:bg-steel-50">
                    <td className="p-3">
                      <p className="text-[14px] font-medium text-ink">{e.name}</p>
                      <p className="text-[11px] text-ink-3">{e.servings} rac.{e.recipe_code ? ` · receta ${e.recipe_code}` : ''}{s.lines_missing ? ` · ${s.lines_missing} sin producto` : ''}</p>
                    </td>
                    <td className="p-3 text-right"><span className="data text-[13px] text-ink">{money(s.total_cost)}</span></td>
                    <td className="p-3 text-right"><span className="data text-[13px] text-ink">{money(s.cost_per_serving)}</span></td>
                    <td className="p-3 text-right"><span className="data text-[13px] text-ink-2">{money(s.sale_price)}</span></td>
                    <td className={`p-3 text-right ${foodCostColor(s.food_cost_pct != null ? Number(s.food_cost_pct) : null)}`}><span className="data text-[13px] font-medium">{s.food_cost_pct != null ? `${s.food_cost_pct}%` : '—'}</span></td>
                    <td className="p-3 text-right"><span className="data text-[13px] text-ink">{money(s.margin)}</span></td>
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        {canCreateRecipe && !e.recipe && (
                          <button onClick={() => toRecipe(e)} title="Crear receta" className="inline-flex items-center gap-1 rounded-lg steel-plate px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-white"><Doc size={14} /> Crear receta</button>
                        )}
                        <button onClick={() => openEdit(e)} title="Editar" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-steel-100 hover:text-ink"><Pencil size={16} /></button>
                        <button onClick={() => remove(e)} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={16} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="steel-plate grid place-items-center rounded-2xl py-16 text-center">
          <Coins size={28} className="text-ink-3" />
          <p className="pass-title mt-3 text-[18px] text-ink">Aún no hay escandallos</p>
          <p className="mt-1 text-[13px] text-ink-2">Crea uno para calcular el coste, el food cost y el margen de un plato.</p>
        </div>
      )}
    </div>
  )
}

function Stat({ label, value, color = 'text-ink' }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wide text-ink-3">{label}</p>
      <p className={`data mt-0.5 text-[16px] font-medium ${color}`}>{value}</p>
    </div>
  )
}

import { useEffect, useState } from 'react'
import { listProducts, createProduct, updateProduct, deleteProduct, adjustStock, listSuppliers, UNIT_CHOICES } from '../lib/catalog'
import { AllergenPicker } from './AllergenPicker'
import { AllergenDisc } from '../lib/allergens'
import { Inventory, Plus, Pencil, Trash, X, Flame } from './icons'
import { feat } from '../auth'

const EMPTY = {
  name: '', category: '', supplier: '', base_unit: 'kg',
  pack_size: '1', pack_price: '', stock_qty: '0', stock_min: '0', allergens: [],
}

export default function InventarioSection({ canEdit, canCost }) {
  const [rows, setRows] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [editing, setEditing] = useState(null) // null | 'new' | id
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [stockFor, setStockFor] = useState(null) // producto para ajustar stock
  const [stockForm, setStockForm] = useState({ kind: 'in', quantity: '', note: '' })

  const load = () => {
    setLoading(true)
    listProducts(onlyLow ? '?low=1' : '')
      .then((data) => { setRows(data); setError('') })
      .catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [onlyLow])
  useEffect(() => { listSuppliers().then(setSuppliers).catch(() => {}) }, [])

  const openNew = () => { setForm(EMPTY); setEditing('new') }
  const openEdit = (p) => {
    setForm({
      name: p.name, category: p.category || '', supplier: p.supplier ?? '',
      base_unit: p.base_unit, pack_size: String(p.pack_size ?? '1'),
      pack_price: p.pack_price != null ? String(p.pack_price) : '',
      stock_qty: String(p.stock_qty ?? '0'), stock_min: String(p.stock_min ?? '0'),
      allergens: p.allergens || [],
    })
    setEditing(p.id)
  }
  const close = () => { setEditing(null); setForm(EMPTY) }

  const save = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    const body = {
      name: form.name, category: form.category,
      supplier: form.supplier || null, base_unit: form.base_unit,
      pack_size: form.pack_size || '0', stock_qty: form.stock_qty || '0',
      stock_min: form.stock_min || '0', allergens: form.allergens,
    }
    if (canCost) body.pack_price = form.pack_price || '0'
    setSaving(true)
    try {
      if (editing === 'new') await createProduct(body)
      else await updateProduct(editing, body)
      close(); load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  const remove = async (p) => {
    if (!window.confirm(`¿Eliminar "${p.name}" del catálogo?`)) return
    try { await deleteProduct(p.id); load() } catch (e) { setError(e.message) }
  }
  const doAdjust = async () => {
    try {
      await adjustStock(stockFor.id, { kind: stockForm.kind, quantity: stockForm.quantity || '0', note: stockForm.note })
      setStockFor(null); setStockForm({ kind: 'in', quantity: '', note: '' }); load()
    } catch (e) { setError(e.message) }
  }

  const inp = (k, label, type = 'text') => (
    <label className="flex flex-col gap-1 text-[13px] text-ink-2">
      {label}
      <input type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })}
        className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" />
    </label>
  )

  return (
    <div className="pb-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="rf-cond text-3xl uppercase tracking-tight text-ink" style={{ fontWeight: 600 }}>Inventario</h1>
          <p className="mt-1 text-sm text-ink-2">Tu catálogo de productos con stock, mínimos y coste. Alimenta el escandallo de las recetas.</p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream shadow-[0_8px_20px_-8px_rgba(238,90,28,.7)] transition hover:bg-ember-hi">
            <Plus size={18} /> Nuevo producto
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">{error}</div>}

      <label className="mb-4 inline-flex items-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="accent-[#e8531f]" />
        Solo productos bajo mínimo
      </label>

      {/* Formulario alta/edición */}
      {editing && (
        <div className="mb-6 rounded-2xl steel-plate p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="pass-title text-[16px] text-ink">{editing === 'new' ? 'Nuevo producto' : 'Editar producto'}</h2>
            <button onClick={close} className="text-ink-3 hover:text-ink"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inp('name', 'Nombre *')}
            {inp('category', 'Categoría')}
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">
              Proveedor
              <select value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })}
                className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">
              Unidad base
              <select value={form.base_unit} onChange={(e) => setForm({ ...form, base_unit: e.target.value })}
                className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                {UNIT_CHOICES.map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}
              </select>
            </label>
            {canCost && inp('pack_size', `Tamaño del pack (${form.base_unit})`)}
            {canCost && inp('pack_price', 'Precio del pack (€)')}
            {inp('stock_qty', `Stock actual (${form.base_unit})`)}
            {inp('stock_min', `Stock mínimo (${form.base_unit})`)}
          </div>
          {canCost && (form.pack_size && form.pack_price) ? (
            <p className="mt-2 text-[12px] text-ink-3">Coste unitario ≈ <span className="data text-ink">{(Number(String(form.pack_price).replace(',', '.')) / Number(String(form.pack_size).replace(',', '.')) || 0).toFixed(4)} €/{form.base_unit}</span></p>
          ) : null}
          {feat('allergens') && (
            <div className="mt-3">
              <span className="text-xs font-medium text-ink-3">Alérgenos del producto:</span>
              <div className="mt-1.5"><AllergenPicker value={form.allergens} onChange={(a) => setForm({ ...form, allergens: a })} /></div>
            </div>
          )}
          <div className="mt-4 flex gap-2">
            <button disabled={saving} onClick={save} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
            <button onClick={close} className="inline-flex h-10 items-center rounded-lg steel-plate px-4 text-sm font-medium text-ink hover:bg-white">Cancelar</button>
          </div>
        </div>
      )}

      {/* Ajuste de stock */}
      {stockFor && (
        <div className="mb-6 rounded-2xl steel-plate p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="pass-title text-[16px] text-ink">Ajustar stock · {stockFor.name}</h2>
            <button onClick={() => setStockFor(null)} className="text-ink-3 hover:text-ink"><X size={18} /></button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">
              Movimiento
              <select value={stockForm.kind} onChange={(e) => setStockForm({ ...stockForm, kind: e.target.value })}
                className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                <option value="in">Entrada (+)</option>
                <option value="out">Salida (−)</option>
                <option value="adjust">Fijar stock</option>
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">
              Cantidad ({stockFor.base_unit})
              <input value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value.replace(/[^\d.,]/g, '') })}
                className="w-32 rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" placeholder="0" />
            </label>
            <button onClick={doAdjust} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi">Aplicar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-3">Cargando…</p>
      ) : rows.length ? (
        <div className="overflow-x-auto rounded-2xl steel-plate">
          <table className="w-full min-w-[720px] border-collapse">
            <thead>
              <tr className="border-b border-steel-300 text-left text-[11px] uppercase tracking-wide text-ink-3">
                <th className="p-3">Producto</th>
                <th className="p-3">Stock</th>
                {canCost && <th className="p-3">Coste</th>}
                {feat('allergens') && <th className="p-3">Alérgenos</th>}
                {canEdit && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-steel-200 last:border-0 hover:bg-steel-50">
                  <td className="p-3">
                    <p className="text-[14px] font-medium text-ink">{p.name}</p>
                    <p className="text-[12px] text-ink-3">{[p.category, p.supplier_name].filter(Boolean).join(' · ') || '—'}</p>
                  </td>
                  <td className="p-3">
                    <span className="data text-[13px] text-ink">{p.stock_qty} {p.base_unit}</span>
                    {p.low_stock && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-ember/12 px-2 py-0.5 text-[10px] font-semibold uppercase text-ember-deep"><Flame size={10} /> bajo</span>}
                    <p className="text-[11px] text-ink-3">mín. {p.stock_min}</p>
                  </td>
                  {canCost && (
                    <td className="p-3">
                      <span className="data text-[13px] text-ink">{p.unit_cost != null ? `${p.unit_cost} €/${p.base_unit}` : '—'}</span>
                    </td>
                  )}
                  {feat('allergens') && (
                    <td className="p-3">
                      <div className="flex flex-wrap gap-1">
                        {(p.allergens || []).length ? p.allergens.map((a) => <AllergenDisc key={a} id={a} size={22} />) : <span className="text-[12px] text-ink-3">—</span>}
                      </div>
                    </td>
                  )}
                  {canEdit && (
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setStockFor(p)} title="Ajustar stock" className="rounded-lg steel-plate px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-white">Stock</button>
                        <button onClick={() => openEdit(p)} title="Editar" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-steel-100 hover:text-ink"><Pencil size={16} /></button>
                        <button onClick={() => remove(p)} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={16} /></button>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="steel-plate grid place-items-center rounded-2xl py-16 text-center">
          <Inventory size={28} className="text-ink-3" />
          <p className="pass-title mt-3 text-[18px] text-ink">{onlyLow ? 'Nada bajo mínimo' : 'Aún no hay productos'}</p>
          <p className="mt-1 text-[13px] text-ink-2">{canEdit ? 'Añade productos para controlar stock y calcular costes.' : 'Cuando se añadan productos, aparecerán aquí.'}</p>
        </div>
      )}
    </div>
  )
}


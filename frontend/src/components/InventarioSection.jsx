import { useEffect, useMemo, useState } from 'react'
import {
  listProducts, createProduct, updateProduct, deleteProduct, adjustStock,
  listSuppliers, listPartidas, createPartida, deletePartida, UNIT_CHOICES,
} from '../lib/catalog'
import { Inventory, Plus, Pencil, Trash, X, Flame } from './icons'

const EMPTY = {
  name: '', partida: '', supplier: '', base_unit: 'kg',
  pack_size: '1', pack_price: '', stock_qty: '0', stock_min: '0',
}

export default function InventarioSection({ canEdit, canCost }) {
  const [rows, setRows] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [partidas, setPartidas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [filterPartida, setFilterPartida] = useState('all') // all | 'none' | id
  const [newPartida, setNewPartida] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | id
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [stockFor, setStockFor] = useState(null)
  const [stockForm, setStockForm] = useState({ kind: 'in', quantity: '' })

  const loadPartidas = () => listPartidas().then(setPartidas).catch(() => {})
  const load = () => {
    setLoading(true)
    listProducts(onlyLow ? '?low=1' : '').then((d) => { setRows(d); setError('') }).catch((e) => setError(e.message)).finally(() => setLoading(false))
    loadPartidas()
  }
  useEffect(load, [onlyLow])
  useEffect(() => { listSuppliers().then(setSuppliers).catch(() => {}) }, [])

  const filtered = useMemo(() => {
    if (filterPartida === 'all') return rows
    if (filterPartida === 'none') return rows.filter((p) => !p.partida)
    return rows.filter((p) => String(p.partida) === String(filterPartida))
  }, [rows, filterPartida])

  const openNew = () => { setForm(EMPTY); setEditing('new') }
  const openEdit = (p) => {
    setForm({
      name: p.name, partida: p.partida ?? '', supplier: p.supplier ?? '',
      base_unit: p.base_unit, pack_size: String(p.pack_size ?? '1'),
      pack_price: p.pack_price != null ? String(p.pack_price) : '',
      stock_qty: String(p.stock_qty ?? '0'), stock_min: String(p.stock_min ?? '0'),
    })
    setEditing(p.id)
  }
  const close = () => { setEditing(null); setForm(EMPTY) }

  const addPartida = async () => {
    if (!newPartida.trim()) return
    try { await createPartida({ name: newPartida.trim() }); setNewPartida(''); loadPartidas() } catch (e) { setError(e.message) }
  }
  const removePartida = async (p) => {
    if (!window.confirm(`¿Eliminar la partida "${p.name}"? Los productos quedarán sin partida.`)) return
    try { await deletePartida(p.id); if (String(filterPartida) === String(p.id)) setFilterPartida('all'); loadPartidas(); load() } catch (e) { setError(e.message) }
  }

  const save = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    const body = {
      name: form.name, partida: form.partida || null, supplier: form.supplier || null,
      base_unit: form.base_unit, pack_size: form.pack_size || '0',
      stock_qty: form.stock_qty || '0', stock_min: form.stock_min || '0',
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
    if (!window.confirm(`¿Eliminar "${p.name}" del inventario?`)) return
    try { await deleteProduct(p.id); load() } catch (e) { setError(e.message) }
  }
  const doAdjust = async () => {
    try { await adjustStock(stockFor.id, { kind: stockForm.kind, quantity: stockForm.quantity || '0' }); setStockFor(null); setStockForm({ kind: 'in', quantity: '' }); load() } catch (e) { setError(e.message) }
  }

  const inp = (k, label) => (
    <label className="flex flex-col gap-1 text-[13px] text-ink-2">{label}
      <input value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
  )

  return (
    <div className="pb-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="rf-cond text-3xl uppercase tracking-tight text-ink" style={{ fontWeight: 600 }}>Inventario</h1>
          <p className="mt-1 text-sm text-ink-2">Insumos con su cantidad y unidad, clasificados por partidas de cocina. Alimentan el escandallo.</p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream shadow-[0_8px_20px_-8px_rgba(238,90,28,.7)] transition hover:bg-ember-hi">
            <Plus size={18} /> Nuevo insumo
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">{error}</div>}

      {/* Partidas: filtro + gestión */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={filterPartida === 'all'} onClick={() => setFilterPartida('all')}>Todas</Chip>
        {partidas.map((p) => (
          <span key={p.id} className="inline-flex items-center">
            <Chip active={String(filterPartida) === String(p.id)} onClick={() => setFilterPartida(p.id)}>{p.name} <span className="data opacity-60">{p.product_count}</span></Chip>
            {canEdit && <button onClick={() => removePartida(p)} title="Eliminar partida" className="ml-0.5 text-ink-3 hover:text-danger"><X size={13} /></button>}
          </span>
        ))}
        <Chip active={filterPartida === 'none'} onClick={() => setFilterPartida('none')}>Sin partida</Chip>
        {canEdit && (
          <span className="inline-flex items-center gap-1">
            <input value={newPartida} onChange={(e) => setNewPartida(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPartida()} placeholder="Nueva partida (Fritos, Fríos…)" className="h-9 w-48 rounded-lg border border-steel-300 bg-white px-2.5 text-[13px] text-ink outline-none focus:border-ember/50" />
            <button onClick={addPartida} className="grid h-9 w-9 place-items-center rounded-lg bg-soot text-cream hover:bg-carbon-2"><Plus size={16} /></button>
          </span>
        )}
      </div>

      <label className="mb-4 inline-flex items-center gap-2 text-[13px] text-ink-2">
        <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="accent-[#e8531f]" /> Solo bajo mínimo
      </label>

      {/* Formulario alta/edición */}
      {editing && (
        <div className="mb-6 rounded-2xl steel-plate p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="pass-title text-[16px] text-ink">{editing === 'new' ? 'Nuevo insumo' : 'Editar insumo'}</h2>
            <button onClick={close} className="text-ink-3 hover:text-ink"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inp('name', 'Nombre *')}
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">Partida
              <select value={form.partida} onChange={(e) => setForm({ ...form, partida: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                <option value="">Sin partida</option>
                {partidas.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">Proveedor
              <select value={form.supplier} onChange={(e) => setForm({ ...form, supplier: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                <option value="">Sin proveedor</option>
                {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">Unidad
              <select value={form.base_unit} onChange={(e) => setForm({ ...form, base_unit: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                {UNIT_CHOICES.map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}
              </select>
            </label>
            {inp('stock_qty', `Cantidad (${form.base_unit})`)}
            {inp('stock_min', `Mínimo (${form.base_unit})`)}
            {canCost && inp('pack_size', `Pack: ${form.base_unit} por compra`)}
            {canCost && inp('pack_price', 'Precio del pack (€)')}
          </div>
          {canCost && form.pack_size && form.pack_price ? (
            <p className="mt-2 text-[12px] text-ink-3">Coste unitario ≈ <span className="data text-ink">{(Number(String(form.pack_price).replace(',', '.')) / Number(String(form.pack_size).replace(',', '.')) || 0).toFixed(4)} €/{form.base_unit}</span></p>
          ) : null}
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
            <h2 className="pass-title text-[16px] text-ink">Ajustar cantidad · {stockFor.name}</h2>
            <button onClick={() => setStockFor(null)} className="text-ink-3 hover:text-ink"><X size={18} /></button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">Movimiento
              <select value={stockForm.kind} onChange={(e) => setStockForm({ ...stockForm, kind: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                <option value="in">Entrada (+)</option><option value="out">Salida (−)</option><option value="adjust">Fijar</option>
              </select></label>
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">Cantidad ({stockFor.base_unit})
              <input value={stockForm.quantity} onChange={(e) => setStockForm({ ...stockForm, quantity: e.target.value.replace(/[^\d.,]/g, '') })} className="w-32 rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" placeholder="0" /></label>
            <button onClick={doAdjust} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi">Aplicar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-3">Cargando…</p>
      ) : filtered.length ? (
        <div className="overflow-x-auto rounded-2xl steel-plate">
          <table className="w-full min-w-[680px] border-collapse">
            <thead>
              <tr className="border-b border-steel-300 text-left text-[11px] uppercase tracking-wide text-ink-3">
                <th className="p-3">Insumo</th>
                <th className="p-3">Partida</th>
                <th className="p-3">Cantidad</th>
                {canCost && <th className="p-3">Coste</th>}
                {canEdit && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((p) => (
                <tr key={p.id} className="border-b border-steel-200 last:border-0 hover:bg-steel-50">
                  <td className="p-3">
                    <p className="text-[14px] font-medium text-ink">{p.name}</p>
                    {p.supplier_name && <p className="text-[12px] text-ink-3">{p.supplier_name}</p>}
                  </td>
                  <td className="p-3">{p.partida_name ? <span className="rounded-full bg-steel-200 px-2.5 py-1 text-[11px] font-medium text-ink-2">{p.partida_name}</span> : <span className="text-[12px] text-ink-3">—</span>}</td>
                  <td className="p-3">
                    <span className="data text-[13px] text-ink">{p.stock_qty} {p.base_unit}</span>
                    {p.low_stock && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-ember/12 px-2 py-0.5 text-[10px] font-semibold uppercase text-ember-deep"><Flame size={10} /> bajo</span>}
                    <p className="text-[11px] text-ink-3">mín. {p.stock_min}</p>
                  </td>
                  {canCost && <td className="p-3"><span className="data text-[13px] text-ink">{p.unit_cost != null ? `${p.unit_cost} €/${p.base_unit}` : '—'}</span></td>}
                  {canEdit && (
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setStockFor(p)} className="rounded-lg steel-plate px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-white">Cantidad</button>
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
          <p className="pass-title mt-3 text-[18px] text-ink">{onlyLow ? 'Nada bajo mínimo' : 'Aún no hay insumos'}</p>
          <p className="mt-1 text-[13px] text-ink-2">{canEdit ? 'Añade insumos y clasifícalos por partidas de cocina.' : 'Cuando se añadan insumos, aparecerán aquí.'}</p>
        </div>
      )}
    </div>
  )
}

function Chip({ active, onClick, children }) {
  return (
    <button onClick={onClick} className={`inline-flex h-9 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors ${active ? 'bg-soot text-cream' : 'steel-plate text-ink-2 hover:text-ink'}`}>{children}</button>
  )
}

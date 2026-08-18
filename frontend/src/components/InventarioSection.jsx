import { useEffect, useMemo, useState } from 'react'
import {
  listInventory, createInventory, updateInventory, deleteInventory, adjustInventory,
  listPartidas, createPartida, deletePartida, UNIT_CHOICES,
} from '../lib/catalog'
import { Inventory, Plus, Pencil, Trash, X, Flame } from './icons'

const EMPTY = { name: '', partida: '', quantity: '0', unit: 'ud', stock_min: '0', notes: '' }

export default function InventarioSection({ canEdit }) {
  const [rows, setRows] = useState([])
  const [partidas, setPartidas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [filterPartida, setFilterPartida] = useState('all') // all | none | id
  const [newPartida, setNewPartida] = useState('')
  const [editing, setEditing] = useState(null) // null | new | id
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [adjFor, setAdjFor] = useState(null)
  const [adjForm, setAdjForm] = useState({ kind: 'in', quantity: '' })

  const loadPartidas = () => listPartidas().then(setPartidas).catch(() => {})
  const load = () => {
    setLoading(true)
    listInventory(onlyLow ? '?low=1' : '').then((d) => { setRows(d); setError('') }).catch((e) => setError(e.message)).finally(() => setLoading(false))
    loadPartidas()
  }
  useEffect(load, [onlyLow])

  const filtered = useMemo(() => {
    if (filterPartida === 'all') return rows
    if (filterPartida === 'none') return rows.filter((i) => !i.partida)
    return rows.filter((i) => String(i.partida) === String(filterPartida))
  }, [rows, filterPartida])

  const openNew = () => { setForm({ ...EMPTY, partida: filterPartida !== 'all' && filterPartida !== 'none' ? filterPartida : '' }); setEditing('new') }
  const openEdit = (i) => {
    setForm({ name: i.name, partida: i.partida ?? '', quantity: String(i.quantity ?? '0'), unit: i.unit, stock_min: String(i.stock_min ?? '0'), notes: i.notes || '' })
    setEditing(i.id)
  }
  const close = () => { setEditing(null); setForm(EMPTY) }

  const addPartida = async () => {
    if (!newPartida.trim()) return
    try { await createPartida({ name: newPartida.trim() }); setNewPartida(''); loadPartidas() } catch (e) { setError(e.message) }
  }
  const removePartida = async (p) => {
    if (!window.confirm(`¿Eliminar la partida "${p.name}"? Los insumos quedarán sin partida.`)) return
    try { await deletePartida(p.id); if (String(filterPartida) === String(p.id)) setFilterPartida('all'); load() } catch (e) { setError(e.message) }
  }

  const save = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    const body = { name: form.name, partida: form.partida || null, quantity: form.quantity || '0', unit: form.unit, stock_min: form.stock_min || '0', notes: form.notes }
    setSaving(true)
    try {
      if (editing === 'new') await createInventory(body)
      else await updateInventory(editing, body)
      close(); load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  const remove = async (i) => {
    if (!window.confirm(`¿Eliminar "${i.name}" del inventario?`)) return
    try { await deleteInventory(i.id); load() } catch (e) { setError(e.message) }
  }
  const doAdjust = async () => {
    try { await adjustInventory(adjFor.id, { kind: adjForm.kind, quantity: adjForm.quantity || '0' }); setAdjFor(null); setAdjForm({ kind: 'in', quantity: '' }); load() } catch (e) { setError(e.message) }
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
          <p className="mt-1 text-sm text-ink-2">Lo que tienes producido y almacenado, con su cantidad, clasificado por partidas de cocina.</p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream shadow-[0_8px_20px_-8px_rgba(238,90,28,.7)] transition hover:bg-ember-hi">
            <Plus size={18} /> Nuevo insumo
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">{error}</div>}

      {/* Partidas */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Chip active={filterPartida === 'all'} onClick={() => setFilterPartida('all')}>Todas</Chip>
        {partidas.map((p) => (
          <span key={p.id} className="inline-flex items-center">
            <Chip active={String(filterPartida) === String(p.id)} onClick={() => setFilterPartida(p.id)}>{p.name} <span className="data opacity-60">{p.item_count}</span></Chip>
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
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">Unidad
              <select value={form.unit} onChange={(e) => setForm({ ...form, unit: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                {UNIT_CHOICES.map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}
              </select>
            </label>
            {inp('quantity', `Cantidad (${form.unit})`)}
            {inp('stock_min', `Mínimo (${form.unit})`)}
            {inp('notes', 'Notas')}
          </div>
          <div className="mt-4 flex gap-2">
            <button disabled={saving} onClick={save} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
            <button onClick={close} className="inline-flex h-10 items-center rounded-lg steel-plate px-4 text-sm font-medium text-ink hover:bg-white">Cancelar</button>
          </div>
        </div>
      )}

      {adjFor && (
        <div className="mb-6 rounded-2xl steel-plate p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="pass-title text-[16px] text-ink">Ajustar cantidad · {adjFor.name}</h2>
            <button onClick={() => setAdjFor(null)} className="text-ink-3 hover:text-ink"><X size={18} /></button>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">Movimiento
              <select value={adjForm.kind} onChange={(e) => setAdjForm({ ...adjForm, kind: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                <option value="in">Entrada (+)</option><option value="out">Salida (−)</option><option value="set">Fijar</option>
              </select></label>
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">Cantidad ({adjFor.unit})
              <input value={adjForm.quantity} onChange={(e) => setAdjForm({ ...adjForm, quantity: e.target.value.replace(/[^\d.,]/g, '') })} className="w-32 rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" placeholder="0" /></label>
            <button onClick={doAdjust} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi">Aplicar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-3">Cargando…</p>
      ) : filtered.length ? (
        <div className="overflow-x-auto rounded-2xl steel-plate">
          <table className="w-full min-w-[560px] border-collapse">
            <thead>
              <tr className="border-b border-steel-300 text-left text-[11px] uppercase tracking-wide text-ink-3">
                <th className="p-3">Insumo</th><th className="p-3">Partida</th><th className="p-3">Cantidad</th>
                {canEdit && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b border-steel-200 last:border-0 hover:bg-steel-50">
                  <td className="p-3">
                    <p className="text-[14px] font-medium text-ink">{i.name}</p>
                    {i.notes && <p className="text-[12px] text-ink-3">{i.notes}</p>}
                  </td>
                  <td className="p-3">{i.partida_name ? <span className="rounded-full bg-steel-200 px-2.5 py-1 text-[11px] font-medium text-ink-2">{i.partida_name}</span> : <span className="text-[12px] text-ink-3">—</span>}</td>
                  <td className="p-3">
                    <span className="data text-[13px] text-ink">{i.quantity} {i.unit}</span>
                    {i.low_stock && <span className="ml-2 inline-flex items-center gap-1 rounded-full bg-ember/12 px-2 py-0.5 text-[10px] font-semibold uppercase text-ember-deep"><Flame size={10} /> bajo</span>}
                    {Number(i.stock_min) > 0 && <p className="text-[11px] text-ink-3">mín. {i.stock_min}</p>}
                  </td>
                  {canEdit && (
                    <td className="p-3">
                      <div className="flex justify-end gap-1">
                        <button onClick={() => setAdjFor(i)} className="rounded-lg steel-plate px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-white">Cantidad</button>
                        <button onClick={() => openEdit(i)} title="Editar" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-steel-100 hover:text-ink"><Pencil size={16} /></button>
                        <button onClick={() => remove(i)} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={16} /></button>
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
          <p className="mt-1 text-[13px] text-ink-2">{canEdit ? 'Añade lo que tengas producido y clasifícalo por partidas.' : 'Cuando se añadan insumos, aparecerán aquí.'}</p>
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

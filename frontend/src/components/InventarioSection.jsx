import { useEffect, useMemo, useState } from 'react'
import {
  listInventory, createInventory, updateInventory, deleteInventory, adjustInventory,
  listPartidas, createPartida, deletePartida, UNIT_CHOICES,
} from '../lib/catalog'
import { Inventory, Plus, Pencil, Trash, X, Flame, ChevronRight } from './icons'

const EMPTY = { name: '', partida: '', quantity: '0', unit: 'ud', stock_min: '0', notes: '' }
const ALL = '__all__'   // ver todas las partidas juntas
const NONE = '__none__' // insumos sin partida

export default function InventarioSection({ canEdit }) {
  const [rows, setRows] = useState([])
  const [partidas, setPartidas] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [onlyLow, setOnlyLow] = useState(false)
  const [open, setOpen] = useState(null)   // null = rejilla de tarjetas | id | NONE | ALL
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

  // Tarjetas: una por partida (+ "Sin partida" si hay huérfanos).
  const cards = useMemo(() => {
    const byId = (id) => rows.filter((i) => String(i.partida) === String(id))
    const list = partidas.map((p) => ({ key: String(p.id), id: p.id, name: p.name, items: byId(p.id) }))
    const orphans = rows.filter((i) => !i.partida)
    if (orphans.length) list.push({ key: NONE, id: null, name: 'Sin partida', items: orphans })
    return list
  }, [rows, partidas])

  const openItems = useMemo(() => {
    if (open === ALL) return rows
    if (open === NONE) return rows.filter((i) => !i.partida)
    return rows.filter((i) => String(i.partida) === String(open))
  }, [rows, open])
  const openName = open === ALL ? 'Todas las partidas' : open === NONE ? 'Sin partida' : (partidas.find((p) => String(p.id) === String(open))?.name || '')

  const openNew = () => { setForm({ ...EMPTY, partida: open && open !== ALL && open !== NONE ? open : '' }); setEditing('new') }
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
    try { await deletePartida(p.id); if (String(open) === String(p.id)) setOpen(null); load() } catch (e) { setError(e.message) }
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
      <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="rf-cond text-3xl uppercase tracking-tight text-ink" style={{ fontWeight: 600 }}>Inventario</h1>
          <p className="mt-1 text-sm text-ink-2">Lo que tienes producido y almacenado, organizado por partidas de cocina.</p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream shadow-[0_8px_20px_-8px_rgba(238,90,28,.7)] transition hover:bg-ember-hi">
            <Plus size={18} /> Nuevo insumo
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">{error}</div>}

      {/* Controles */}
      <div className="mb-5 flex flex-wrap items-center gap-x-4 gap-y-2">
        <label className="inline-flex items-center gap-2 text-[13px] text-ink-2">
          <input type="checkbox" checked={onlyLow} onChange={(e) => setOnlyLow(e.target.checked)} className="accent-[#e8531f]" /> Solo bajo mínimo
        </label>
        {canEdit && (
          <span className="inline-flex items-center gap-1.5">
            <input value={newPartida} onChange={(e) => setNewPartida(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && addPartida()} placeholder="Nueva partida (Fritos, Fríos…)" className="h-9 w-52 rounded-lg border border-steel-300 bg-white px-2.5 text-[13px] text-ink outline-none focus:border-ember/50" />
            <button onClick={addPartida} title="Añadir partida" className="grid h-9 w-9 place-items-center rounded-lg bg-soot text-cream hover:bg-carbon-2"><Plus size={16} /></button>
          </span>
        )}
      </div>

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
      ) : open === null ? (
        /* ── REJILLA DE TARJETAS POR PARTIDA ── */
        (cards.length || rows.length) ? (
          <>
            <div className="mb-3 flex items-center justify-between">
              <p className="pass-title text-[13px] tracking-[0.1em] text-ink-3">Partidas</p>
              {rows.length > 0 && (
                <button onClick={() => setOpen(ALL)} className="inline-flex items-center gap-1 text-[13px] font-medium text-ember-deep hover:text-ember">
                  Ver todo junto <ChevronRight size={15} />
                </button>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {cards.map((c) => {
                const low = c.items.filter((i) => i.low_stock).length
                return (
                  <div key={c.key} className="group relative overflow-hidden rounded-2xl steel-plate transition hover:shadow-[var(--shadow-plate)]">
                    <button onClick={() => setOpen(c.key)} className="block w-full p-5 text-left">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="mb-1 flex items-center gap-2">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-full" style={low ? { background: 'radial-gradient(circle at 38% 32%, #ffd7a1, var(--rf-lamp) 58%, var(--rf-ember) 100%)', boxShadow: '0 0 8px 1px rgba(255,154,61,.7)' } : { background: 'var(--rf-gold)' }} aria-hidden />
                            <h3 className="pass-title truncate text-[17px] text-ink">{c.name}</h3>
                          </div>
                          <p className="text-[12px] text-ink-3">{c.items.length} {c.items.length === 1 ? 'insumo' : 'insumos'}</p>
                        </div>
                        <span className="data grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-carbon text-[16px] font-semibold text-cream">{c.items.length}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-steel-200 pt-3">
                        {low ? (
                          <span className="inline-flex items-center gap-1 text-[12px] font-medium text-ember-deep"><Flame size={12} /> {low} bajo mínimo</span>
                        ) : (
                          <span className="text-[12px] text-ok">Todo al día</span>
                        )}
                        <span className="inline-flex items-center gap-0.5 text-[12px] font-medium text-ink-2 group-hover:text-ink">Abrir <ChevronRight size={14} /></span>
                      </div>
                    </button>
                    {canEdit && c.id != null && (
                      <button onClick={() => removePartida(c)} title="Eliminar partida" className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-lg text-ink-3 opacity-60 transition hover:bg-danger/8 hover:text-danger hover:opacity-100"><X size={15} /></button>
                    )}
                  </div>
                )
              })}
              {canEdit && !cards.length && (
                <div className="steel-plate grid place-items-center rounded-2xl py-10 text-center">
                  <p className="text-[13px] text-ink-3">Crea una partida (Fríos, Calientes, Fritos…) para empezar a organizar tu inventario.</p>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="steel-plate grid place-items-center rounded-2xl py-16 text-center">
            <Inventory size={28} className="text-ink-3" />
            <p className="pass-title mt-3 text-[18px] text-ink">{onlyLow ? 'Nada bajo mínimo' : 'Aún no hay inventario'}</p>
            <p className="mt-1 text-[13px] text-ink-2">{canEdit ? 'Crea una partida y añade lo que tengas producido.' : 'Cuando se añada inventario, aparecerá aquí.'}</p>
          </div>
        )
      ) : (
        /* ── DETALLE: una partida (o todas juntas) ── */
        <div>
          <button onClick={() => setOpen(null)} className="mb-3 inline-flex items-center gap-1 text-[13px] font-medium text-ink-2 hover:text-ink">
            <ChevronRight size={15} className="rotate-180" /> Todas las partidas
          </button>
          <div className="mb-3 flex items-center gap-2">
            <h2 className="pass-title text-[20px] text-ink">{openName}</h2>
            <span className="data rounded-full bg-steel-200 px-2.5 py-0.5 text-[12px] font-medium text-ink-2">{openItems.length}</span>
            {canEdit && open !== ALL && open !== NONE && (
              <button onClick={() => removePartida(partidas.find((p) => String(p.id) === String(open)))}
                className="ml-auto inline-flex items-center gap-1 rounded-lg border border-danger/30 bg-danger/8 px-2.5 py-1.5 text-[12px] font-medium text-danger hover:bg-danger/12">
                <Trash size={14} /> Eliminar partida
              </button>
            )}
          </div>

          {openItems.length ? (
            open === ALL ? (
              /* Todas juntas: agrupadas por partida */
              <div className="space-y-5">
                {cards.map((c) => c.items.length ? (
                  <div key={c.key}>
                    <p className="pass-title mb-2 text-[13px] text-ink-2">{c.name} <span className="data text-ink-3">· {c.items.length}</span></p>
                    <ItemList items={c.items} canEdit={canEdit} onAdjust={setAdjFor} onEdit={openEdit} onRemove={remove} />
                  </div>
                ) : null)}
              </div>
            ) : (
              <ItemList items={openItems} canEdit={canEdit} onAdjust={setAdjFor} onEdit={openEdit} onRemove={remove} />
            )
          ) : (
            <div className="steel-plate rounded-2xl px-5 py-10 text-center text-[13px] text-ink-3">
              Esta partida aún no tiene insumos. {canEdit && 'Usa «Nuevo insumo» para añadir.'}
            </div>
          )}
        </div>
      )}
    </div>
  )
}

// Lista limpia de insumos de inventario (nombre, cantidad, mínimo, acciones).
function ItemList({ items, canEdit, onAdjust, onEdit, onRemove }) {
  return (
    <div className="overflow-hidden rounded-2xl steel-plate">
      {items.map((i, idx) => (
        <div key={i.id} className={`flex items-center gap-4 px-4 py-3 sm:px-5 ${idx ? 'border-t border-steel-200' : ''} ${i.low_stock ? 'bg-ember/[.04]' : ''}`}>
          <div className="min-w-0 flex-1">
            <p className="truncate text-[14px] font-medium text-ink">{i.name}</p>
            {i.notes && <p className="truncate text-[12px] text-ink-3">{i.notes}</p>}
          </div>
          <div className="shrink-0 text-right">
            <p className="data text-[15px] font-semibold text-ink">{i.quantity} {i.unit}</p>
            {Number(i.stock_min) > 0 && <p className="text-[11px] text-ink-3">mín. {i.stock_min}</p>}
          </div>
          {i.low_stock && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-ember/12 px-2 py-0.5 text-[10px] font-semibold uppercase text-ember-deep"><Flame size={10} /> bajo</span>}
          {canEdit && (
            <div className="flex shrink-0 items-center gap-1">
              <button onClick={() => onAdjust(i)} className="rounded-lg steel-plate px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-white">Cantidad</button>
              <button onClick={() => onEdit(i)} title="Editar" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-steel-100 hover:text-ink"><Pencil size={16} /></button>
              <button onClick={() => onRemove(i)} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={16} /></button>
            </div>
          )}
        </div>
      ))}
    </div>
  )
}

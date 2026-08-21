import { useEffect, useState } from 'react'
import {
  listInsumos, createInsumo, updateInsumo, deleteInsumo,
  createFormato, deleteFormato, registerPrice, numTrim, eur, priceLabel,
} from '../../lib/costeo'
import { listSuppliers } from '../../lib/catalog'
import FormatoForm, { fmtToBody } from './FormatoForm'
import { Coins, Plus, Pencil, Trash, Eye, X } from '../icons'

const EMPTY_INS = { name: '' }

export default function InsumosPanel({ canEdit }) {
  const [rows, setRows] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null)          // null | 'new' | id
  const [form, setForm] = useState(EMPTY_INS)
  const [existingFormats, setExistingFormats] = useState([]) // formatos ya guardados (edición)
  const [existingRef, setExistingRef] = useState(null)
  const [pending, setPending] = useState([])            // formatos por crear al guardar
  const [saving, setSaving] = useState(false)
  const [preview, setPreview] = useState(null)          // insumo a previsualizar (tarea 6)

  const load = () => {
    setLoading(true)
    listInsumos().then((d) => { setRows(d); setError('') }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])
  useEffect(() => { listSuppliers().then(setSuppliers).catch(() => {}) }, [])

  const openNew = () => { setForm(EMPTY_INS); setExistingFormats([]); setExistingRef(null); setPending([]); setEditing('new') }
  const openEdit = (i) => {
    setForm({ name: i.name })
    setExistingFormats(i.formats || []); setExistingRef(i.reference_format); setPending([])
    setEditing(i.id)
  }
  const close = () => { setEditing(null); setForm(EMPTY_INS); setExistingFormats([]); setPending([]) }

  const addPending = (f) => { setPending((p) => [...p, fmtToBody(f)]); setError('') }
  const removePending = (idx) => setPending((p) => p.filter((_, i) => i !== idx))

  // Acciones sobre formatos YA guardados (solo en edición).
  const reload = () => listInsumos().then((d) => { setRows(d); const cur = d.find((x) => x.id === editing); if (cur) { setExistingFormats(cur.formats || []); setExistingRef(cur.reference_format) } })
  const setReference = async (id) => { try { await updateInsumo(editing, { reference_format: id }); reload() } catch (e) { setError(e.message) } }
  const bumpPrice = async (f) => { const p = window.prompt('Nuevo precio del formato (€):', f.price); if (p == null) return; try { await registerPrice(f.id, { price: p, price_includes_iva: f.price_includes_iva, iva_rate: f.iva_rate }); reload() } catch (e) { setError(e.message) } }
  const delExisting = async (id) => { if (!window.confirm('¿Quitar este formato?')) return; try { await deleteFormato(id); reload() } catch (e) { setError(e.message) } }

  const save = async () => {
    if (!form.name.trim()) { setError('El insumo necesita un nombre.'); return }
    setSaving(true)
    try {
      // base_unit se DERIVA en el backend del formato de compra (no se envía).
      const insumo = editing === 'new' ? await createInsumo({ name: form.name }) : await updateInsumo(editing, { name: form.name })
      for (const p of pending) {
        await createFormato({ insumo: insumo.id, ...p })
      }
      close(); load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  const remove = async (i) => {
    if (!window.confirm(`¿Eliminar el insumo "${i.name}"?`)) return
    try { await deleteInsumo(i.id); load() } catch (e) { setError(e.message) }
  }

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-2">Materia prima con sus formatos de compra. El precio del formato de referencia alimenta el escandallo.</p>
        {canEdit && <button onClick={openNew} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi"><Plus size={16} /> Nuevo insumo</button>}
      </div>

      {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">{error}</div>}

      {editing && (
        <div className="mb-6 rounded-2xl steel-plate p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="pass-title text-[16px] text-ink">{editing === 'new' ? 'Nuevo insumo' : 'Editar insumo'}</h3>
            <button onClick={close} className="text-ink-3 hover:text-ink"><X size={18} /></button>
          </div>
          <label className="flex max-w-md flex-col gap-1 text-[13px] text-ink-2">Nombre *
            <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>

          {/* Formatos de compra (siempre visible) */}
          <div className="mt-4 rounded-lg border border-steel-300 bg-steel-50/60 p-3">
            <p className="pass-title mb-2 text-[13px] text-ink">Formato de compra</p>
            {canEdit && <FormatoForm suppliers={suppliers} onAdd={addPending} />}

            {/* Lista: formatos guardados (edición) + pendientes (por crear) */}
            {(existingFormats.length || pending.length) ? (
              <div className="mt-3 overflow-hidden rounded-lg border border-steel-200">
                {existingFormats.map((f, idx) => {
                  const isRef = existingRef === f.id
                  return (
                    <div key={f.id} className={`flex flex-wrap items-center gap-3 bg-white px-3 py-2 ${idx ? 'border-t border-steel-200' : ''}`}>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[13px] text-ink">{f.description || 'Formato'} {isRef && <span className="ml-1 rounded-full bg-ember/12 px-2 py-0.5 text-[10px] font-semibold uppercase text-ember-deep">referencia</span>}</p>
                        <p className="text-[11px] text-ink-3">{f.supplier_name ? `${f.supplier_name} · ` : ''}{eur(f.price)}{f.price_includes_iva ? ' (con IVA)' : ''}</p>
                      </div>
                      <span className="data text-[12px] text-ink-2">{priceLabel(f) || '—'}</span>
                      {!isRef && <button onClick={() => setReference(f.id)} className="rounded-lg steel-plate px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-white">Usar</button>}
                      <button onClick={() => bumpPrice(f)} className="rounded-lg steel-plate px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-white">Precio</button>
                      <button onClick={() => delExisting(f.id)} className="text-ink-3 hover:text-danger"><Trash size={14} /></button>
                    </div>
                  )
                })}
                {pending.map((p, idx) => (
                  <div key={`p${idx}`} className={`flex flex-wrap items-center gap-3 bg-steel-50 px-3 py-2 ${(existingFormats.length || idx) ? 'border-t border-steel-200' : ''}`}>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[13px] text-ink">{p.description || 'Formato'} <span className="ml-1 rounded-full bg-steel-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-2">al guardar</span></p>
                      <p className="text-[11px] text-ink-3">{eur(p.price)}{p.price_includes_iva ? ' (con IVA)' : ''} · {(p.pack_levels || []).join('×') || '1'} × {numTrim(p.unit_size)} {p.unit_size_unit}</p>
                    </div>
                    <button onClick={() => removePending(idx)} className="text-ink-3 hover:text-danger"><Trash size={14} /></button>
                  </div>
                ))}
              </div>
            ) : <p className="mt-3 text-[12px] text-ink-3">Añade al menos un formato con su precio para que el insumo tenga coste.</p>}
          </div>

          <div className="mt-4 flex gap-2">
            <button disabled={saving} onClick={save} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
            <button onClick={close} className="inline-flex h-10 items-center rounded-lg steel-plate px-4 text-sm font-medium text-ink hover:bg-white">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-sm text-ink-3">Cargando…</p> : rows.length ? (
        <div className="overflow-hidden rounded-2xl steel-plate">
          {rows.map((i, idx) => (
            <div key={i.id} className={`flex items-center gap-4 px-4 py-3.5 sm:px-5 ${idx ? 'border-t border-steel-200' : ''}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{i.name}</p>
                <p className="text-[12px] text-ink-3">{priceLabel(i) || 'sin precio'}</p>
              </div>
              <span className="hidden rounded-full bg-steel-200 px-2.5 py-1 text-[11px] font-medium text-ink-2 sm:inline-flex"><span className="data mr-1">{i.formats?.length || 0}</span> formatos</span>
              <button onClick={() => setPreview(i)} title="Ver" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-steel-100 hover:text-ink"><Eye size={16} /></button>
              {canEdit && <>
                <button onClick={() => openEdit(i)} title="Editar" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-steel-100 hover:text-ink"><Pencil size={16} /></button>
                <button onClick={() => remove(i)} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={16} /></button>
              </>}
            </div>
          ))}
        </div>
      ) : (
        <div className="steel-plate grid place-items-center rounded-2xl py-16 text-center">
          <Coins size={28} className="text-ink-3" />
          <p className="pass-title mt-3 text-[18px] text-ink">Aún no hay insumos</p>
          <p className="mt-1 text-[13px] text-ink-2">Da de alta tu materia prima y sus formatos de compra para calcular escandallos.</p>
        </div>
      )}

      {preview && <InsumoPreview insumo={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

// Vista previa de solo lectura de un insumo con sus formatos y precios (tarea 6).
function InsumoPreview({ insumo, onClose }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-soot/50 p-4" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl bg-cream p-5 shadow-[var(--shadow-forge)]" onClick={(e) => e.stopPropagation()}>
        <div className="mb-3 flex items-start justify-between">
          <div>
            <h3 className="pass-title text-[18px] text-ink">{insumo.name}</h3>
            <p className="text-[12px] text-ink-3">{priceLabel(insumo) ? `Coste de referencia: ${priceLabel(insumo)}` : 'Sin precio de referencia'}</p>
          </div>
          <button onClick={onClose} className="text-ink-3 hover:text-ink"><X size={20} /></button>
        </div>
        {(insumo.formats || []).length ? (
          <div className="overflow-hidden rounded-lg border border-steel-200">
            {insumo.formats.map((f, idx) => {
              const isRef = insumo.reference_format === f.id
              return (
                <div key={f.id} className={`flex items-center gap-3 px-3 py-2.5 ${idx ? 'border-t border-steel-200' : ''} ${isRef ? 'bg-ember/8' : 'bg-white'}`}>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[13px] font-medium text-ink">{f.description || 'Formato'} {isRef && <span className="ml-1 rounded-full bg-ember/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-ember-deep">referencia</span>}</p>
                    <p className="text-[11px] text-ink-3">{f.supplier_name ? `${f.supplier_name} · ` : ''}{eur(f.price)}{f.price_includes_iva ? ' (con IVA)' : ''} · {(f.pack_levels || []).join('×') || '1'} × {numTrim(f.unit_size)} {f.unit_size_unit}</p>
                  </div>
                  <span className="data shrink-0 text-[13px] text-ink">{priceLabel(f) || '—'}</span>
                </div>
              )
            })}
          </div>
        ) : <p className="text-[13px] text-ink-2">Este insumo aún no tiene formatos de compra.</p>}
      </div>
    </div>
  )
}

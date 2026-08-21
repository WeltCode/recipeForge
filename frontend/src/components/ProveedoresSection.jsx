import { useEffect, useState } from 'react'
import {
  listSuppliers, createSupplier, updateSupplier, deleteSupplier,
} from '../lib/catalog'
import { listInsumos, getInsumo, createInsumo, createFormato, updateFormato, deleteFormato, priceLabel } from '../lib/costeo'
import FormatoForm, { fmtToBody, fmtFromStored } from './costeo/FormatoForm'
import InsumoPreview from './costeo/InsumoPreview'
import { Truck, Plus, Pencil, Trash, Eye, X } from './icons'

const EMPTY = {
  name: '', tax_id: '', contact_name: '', email: '', phone: '',
  website: '', payment_terms: '', delivery_days: '', notes: '',
}
const norm = (s) => (s || '').trim().toLowerCase()

export default function ProveedoresSection({ canEdit, canCost }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | new | id
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [prodFor, setProdFor] = useState(null) // proveedor al que se añade producto
  const [prodName, setProdName] = useState('')
  const [prodEdit, setProdEdit] = useState(null) // format_id del insumo/formato en edición
  const [preview, setPreview] = useState(null)   // insumo a previsualizar (tarea 4)

  const openPreview = async (insumoId) => {
    try { setPreview(await getInsumo(insumoId)) } catch (e) { setError(e.message) }
  }

  const load = () => {
    setLoading(true)
    listSuppliers().then((d) => { setRows(d); setError('') }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openNew = () => { setForm(EMPTY); setEditing('new') }
  const openEdit = (s) => {
    setForm({
      name: s.name, tax_id: s.tax_id || '', contact_name: s.contact_name, email: s.email, phone: s.phone,
      website: s.website || '', payment_terms: s.payment_terms || '', delivery_days: s.delivery_days || '',
      notes: s.notes || '',
    })
    setEditing(s.id)
  }
  const close = () => { setEditing(null); setForm(EMPTY) }

  const save = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    try {
      if (editing === 'new') await createSupplier(form)
      else await updateSupplier(editing, form)
      close(); load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  const remove = async (s) => {
    if (!window.confirm(`¿Eliminar el proveedor "${s.name}"? Sus insumos seguirán en «Insumos y precios» sin proveedor.`)) return
    try { await deleteSupplier(s.id); load() } catch (e) { setError(e.message) }
  }

  // Añade un producto que se le compra al proveedor = insumo + formato de compra.
  // Si el insumo ya existe (por nombre) se reutiliza; si no, se crea. Así aparece
  // también en «Insumos y precios» del escandallo (misma fuente de datos).
  const addProducto = async (supplierId, fmt) => {
    if (!prodName.trim()) { setError('El producto necesita un nombre.'); return }
    try {
      const insumos = await listInsumos()
      let insumo = insumos.find((x) => norm(x.name) === norm(prodName))
      if (!insumo) insumo = await createInsumo({ name: prodName.trim() })
      await createFormato({ insumo: insumo.id, ...fmtToBody({ ...fmt, supplier: String(supplierId) }) })
      setProdName(''); setProdFor(null); load()
    } catch (e) { setError(e.message) }
  }
  const removeProducto = async (formatId) => {
    if (!window.confirm('¿Quitar este formato de compra del proveedor? (El insumo se mantiene)')) return
    try { await deleteFormato(formatId); load() } catch (e) { setError(e.message) }
  }
  // Edita el precio / presentación de un formato ya guardado (sin borrar y recrear).
  const saveProdEdit = async (formatId, fmt) => {
    try { await updateFormato(formatId, fmtToBody(fmt)); setProdEdit(null); load() } catch (e) { setError(e.message) }
  }

  const field = (k, label, type = 'text') => (
    <label className="flex flex-col gap-1 text-[13px] text-ink-2">{label}
      <input type={type} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
  )

  return (
    <div className="pb-6">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="rf-cond text-3xl uppercase tracking-tight text-ink" style={{ fontWeight: 600 }}>Proveedores</h1>
          <p className="mt-1 text-sm text-ink-2">Tus distribuidores y los insumos que les compras (con precio en €). Ese precio alimenta el escandallo y aparece en «Insumos y precios».</p>
        </div>
        {canEdit && (
          <button onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream shadow-[0_8px_20px_-8px_rgba(238,90,28,.7)] transition hover:bg-ember-hi">
            <Plus size={18} /> Nuevo proveedor
          </button>
        )}
      </div>

      {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">{error}</div>}

      {editing && (
        <div className="mb-6 rounded-2xl steel-plate p-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="pass-title text-[16px] text-ink">{editing === 'new' ? 'Nuevo proveedor' : 'Editar proveedor'}</h2>
            <button onClick={close} className="text-ink-3 hover:text-ink"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {field('name', 'Nombre *')}
            {field('tax_id', 'CIF / NIF (opcional)')}
            {field('contact_name', 'Persona de contacto')}
            {field('email', 'Email', 'email')}
            {field('phone', 'Teléfono')}
            {field('website', 'Web')}
            {field('payment_terms', 'Condiciones de pago (ej. 30 días)')}
            {field('delivery_days', 'Días de entrega (ej. L, X, V)')}
          </div>
          <label className="mt-3 flex flex-col gap-1 text-[13px] text-ink-2">Notas
            <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
          {editing === 'new' && <p className="mt-2 text-[12px] text-ink-3">Crea el proveedor y luego, al abrirlo, añade los insumos que le compras con su formato de precio.</p>}

          <div className="mt-4 flex gap-2">
            <button disabled={saving} onClick={save} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
            <button onClick={close} className="inline-flex h-10 items-center rounded-lg steel-plate px-4 text-sm font-medium text-ink hover:bg-white">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-3">Cargando…</p>
      ) : rows.length ? (
        <div className="space-y-3">
          {rows.map((s) => {
            const open = expanded === s.id
            return (
              <div key={s.id} className="overflow-hidden rounded-2xl steel-plate">
                <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                  <button onClick={() => setExpanded(open ? null : s.id)} className="grid h-11 w-11 flex-none place-items-center rounded-full bg-soot text-cream"><Truck size={18} /></button>
                  <button onClick={() => setExpanded(open ? null : s.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[14px] font-medium text-ink">{s.name}</p>
                    <p className="truncate text-[12px] text-ink-2">{[s.contact_name, s.phone, s.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}</p>
                  </button>
                  <span className="hidden rounded-full bg-steel-200 px-2.5 py-1 text-[11px] font-medium text-ink-2 sm:inline-flex"><span className="data mr-1">{s.product_count}</span> insumos</span>
                  {canEdit && (
                    <>
                      <button onClick={() => openEdit(s)} title="Editar" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-steel-100 hover:text-ink"><Pencil size={16} /></button>
                      <button onClick={() => remove(s)} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={16} /></button>
                    </>
                  )}
                </div>

                {open && (
                  <div className="border-t border-steel-200 bg-steel-50/60 px-4 py-4 sm:px-5">
                    {(s.tax_id || s.payment_terms || s.delivery_days || s.website || s.notes) && (
                      <div className="mb-4 grid gap-x-6 gap-y-1 text-[12.5px] text-ink-2 sm:grid-cols-2">
                        {s.tax_id && <p><span className="text-ink-3">CIF/NIF:</span> {s.tax_id}</p>}
                        {s.website && <p><span className="text-ink-3">Web:</span> {s.website}</p>}
                        {s.payment_terms && <p><span className="text-ink-3">Pago:</span> {s.payment_terms}</p>}
                        {s.delivery_days && <p><span className="text-ink-3">Entregas:</span> {s.delivery_days}</p>}
                        {s.notes && <p className="sm:col-span-2"><span className="text-ink-3">Notas:</span> {s.notes}</p>}
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <p className="pass-title text-[13px] text-ink">Insumos que le compras</p>
                      {canEdit && <button onClick={() => { setProdFor(prodFor === s.id ? null : s.id); setProdName('') }} className="inline-flex items-center gap-1 rounded-lg steel-plate px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-white"><Plus size={14} /> Añadir producto</button>}
                    </div>

                    {prodFor === s.id && (
                      <div className="mt-2 rounded-lg border border-steel-300 bg-white p-3">
                        <label className="mb-2 flex max-w-xs flex-col gap-1 text-[12px] text-ink-2">Nombre del insumo / producto
                          <input value={prodName} onChange={(e) => setProdName(e.target.value)} placeholder="p. ej. Dientes de Ajo pelados" className="rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
                        <FormatoForm lockedSupplier={s.id} onAdd={(f) => addProducto(s.id, f)} compact />
                      </div>
                    )}

                    {(s.products || []).length ? (
                      <div className="mt-3 overflow-hidden rounded-lg border border-steel-200">
                        {s.products.map((p, i) => (
                          <div key={p.format_id} className={`bg-white ${i ? 'border-t border-steel-200' : ''}`}>
                            {prodEdit === p.format_id ? (
                              <div className="p-3">
                                <p className="mb-2 text-[12px] font-medium text-ink">{p.name}</p>
                                <FormatoForm key={`edit-${p.format_id}`} lockedSupplier={s.id} compact
                                  initial={fmtFromStored(p)} submitLabel="Guardar"
                                  onCancel={() => setProdEdit(null)} onAdd={(f) => saveProdEdit(p.format_id, f)} />
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 px-3 py-2">
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-[13px] text-ink">{p.name}{p.description ? <span className="text-ink-3"> · {p.description}</span> : ''}</p>
                                </div>
                                {canCost && <span className="data text-[12px] text-ink-2">{priceLabel(p) || `— /${p.base_unit}`}</span>}
                                <button onClick={() => openPreview(p.insumo_id)} title="Ver insumo" className="text-ink-3 hover:text-ink"><Eye size={14} /></button>
                                {canEdit && canCost && <button onClick={() => setProdEdit(p.format_id)} title="Editar precio/presentación" className="text-ink-3 hover:text-ink"><Pencil size={14} /></button>}
                                {canEdit && <button onClick={() => removeProducto(p.format_id)} title="Quitar" className="text-ink-3 hover:text-danger"><Trash size={14} /></button>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : <p className="mt-3 text-[12px] text-ink-3">Aún no hay insumos de este proveedor.</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="steel-plate grid place-items-center rounded-2xl py-16 text-center">
          <Truck size={28} className="text-ink-3" />
          <p className="pass-title mt-3 text-[18px] text-ink">Aún no hay proveedores</p>
          <p className="mt-1 text-[13px] text-ink-2">{canEdit ? 'Añade tu primer proveedor y sus insumos con precio.' : 'Cuando se añadan proveedores, aparecerán aquí.'}</p>
        </div>
      )}

      {preview && <InsumoPreview insumo={preview} onClose={() => setPreview(null)} />}
    </div>
  )
}

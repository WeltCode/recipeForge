import { useEffect, useState } from 'react'
import {
  listSuppliers, createSupplier, updateSupplier, deleteSupplier,
  createProduct, updateProduct, deleteProduct, UNIT_CHOICES,
} from '../lib/catalog'
import { Truck, Plus, Pencil, Trash, X } from './icons'

const EMPTY = {
  name: '', tax_id: '', contact_name: '', email: '', phone: '',
  website: '', payment_terms: '', delivery_days: '', notes: '',
  products: [], // solo al crear
}
const EMPTY_PROD = { name: '', base_unit: 'kg', pack_size: '1', pack_price: '' }

export default function ProveedoresSection({ canEdit, canCost }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | new | id
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [expanded, setExpanded] = useState(null)
  const [prodFor, setProdFor] = useState(null) // proveedor al que se añade producto
  const [prod, setProd] = useState(EMPTY_PROD)
  const [prodEdit, setProdEdit] = useState(null) // {id, ...campos} en edición

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
      notes: s.notes || '', products: [],
    })
    setEditing(s.id)
  }
  const close = () => { setEditing(null); setForm(EMPTY) }

  // Productos iniciales (solo en el alta de proveedor).
  const addFormProduct = () => setForm((f) => ({ ...f, products: [...f.products, { ...EMPTY_PROD }] }))
  const setFormProduct = (i, k, v) => setForm((f) => ({ ...f, products: f.products.map((p, idx) => idx === i ? { ...p, [k]: v } : p) }))
  const removeFormProduct = (i) => setForm((f) => ({ ...f, products: f.products.filter((_, idx) => idx !== i) }))

  const save = async () => {
    if (!form.name.trim()) { setError('El nombre es obligatorio.'); return }
    setSaving(true)
    try {
      const { products, ...supplierData } = form
      if (editing === 'new') {
        const created = await createSupplier(supplierData)
        for (const p of products.filter((x) => x.name.trim())) {
          const body = { name: p.name, base_unit: p.base_unit, supplier: created.id }
          if (canCost) { body.pack_size = p.pack_size || '1'; body.pack_price = p.pack_price || '0' }
          await createProduct(body)
        }
      } else {
        await updateSupplier(editing, supplierData)
      }
      close(); load()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  const remove = async (s) => {
    if (!window.confirm(`¿Eliminar el proveedor "${s.name}"? Sus productos quedarán sin proveedor.`)) return
    try { await deleteSupplier(s.id); load() } catch (e) { setError(e.message) }
  }
  const addProduct = async (supplierId) => {
    if (!prod.name.trim()) { setError('El producto necesita un nombre.'); return }
    try {
      const body = { name: prod.name, base_unit: prod.base_unit, supplier: supplierId }
      if (canCost) { body.pack_size = prod.pack_size || '1'; body.pack_price = prod.pack_price || '0' }
      await createProduct(body); setProd(EMPTY_PROD); setProdFor(null); load()
    } catch (e) { setError(e.message) }
  }
  const saveProdEdit = async () => {
    try {
      const body = { name: prodEdit.name, base_unit: prodEdit.base_unit }
      if (canCost) { body.pack_size = prodEdit.pack_size || '1'; body.pack_price = prodEdit.pack_price || '0' }
      await updateProduct(prodEdit.id, body); setProdEdit(null); load()
    } catch (e) { setError(e.message) }
  }
  const removeProduct = async (id) => {
    if (!window.confirm('¿Quitar este producto?')) return
    try { await deleteProduct(id); load() } catch (e) { setError(e.message) }
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
          <p className="mt-1 text-sm text-ink-2">Tus distribuidores y los productos que les compras (con precio en €). Ese precio alimenta el escandallo.</p>
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

          {/* Productos iniciales (solo al crear) */}
          {editing === 'new' && (
            <div className="mt-4 rounded-lg border border-steel-300 bg-steel-50/60 p-3">
              <div className="flex items-center justify-between">
                <p className="pass-title text-[13px] text-ink">Productos de este proveedor</p>
                <button onClick={addFormProduct} className="inline-flex items-center gap-1 rounded-lg steel-plate px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-white"><Plus size={14} /> Añadir</button>
              </div>
              {form.products.map((p, i) => (
                <div key={i} className="mt-2 flex flex-wrap items-end gap-2">
                  <input value={p.name} onChange={(e) => setFormProduct(i, 'name', e.target.value)} placeholder="Producto" className="w-40 rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" />
                  <select value={p.base_unit} onChange={(e) => setFormProduct(i, 'base_unit', e.target.value)} className="rounded-lg border border-steel-300 px-2 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50">
                    {UNIT_CHOICES.map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}
                  </select>
                  {canCost && <input value={p.pack_size} onChange={(e) => setFormProduct(i, 'pack_size', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Pack" className="w-16 rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" />}
                  {canCost && <input value={p.pack_price} onChange={(e) => setFormProduct(i, 'pack_price', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Precio €" className="w-24 rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" />}
                  <button onClick={() => removeFormProduct(i)} className="grid h-8 w-8 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={14} /></button>
                </div>
              ))}
              {!form.products.length && <p className="mt-2 text-[12px] text-ink-3">Puedes añadir productos ahora o más tarde al abrir el proveedor.</p>}
            </div>
          )}

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
                  <span className="hidden rounded-full bg-steel-200 px-2.5 py-1 text-[11px] font-medium text-ink-2 sm:inline-flex"><span className="data mr-1">{s.product_count}</span> productos</span>
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
                      <p className="pass-title text-[13px] text-ink">Productos que le compras</p>
                      {canEdit && <button onClick={() => { setProdFor(prodFor === s.id ? null : s.id); setProd(EMPTY_PROD) }} className="inline-flex items-center gap-1 rounded-lg steel-plate px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-white"><Plus size={14} /> Añadir producto</button>}
                    </div>

                    {prodFor === s.id && (
                      <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-steel-300 bg-white p-3">
                        <label className="flex flex-col gap-1 text-[12px] text-ink-2">Producto
                          <input value={prod.name} onChange={(e) => setProd({ ...prod, name: e.target.value })} className="w-44 rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
                        <label className="flex flex-col gap-1 text-[12px] text-ink-2">Unidad
                          <select value={prod.base_unit} onChange={(e) => setProd({ ...prod, base_unit: e.target.value })} className="rounded-lg border border-steel-300 px-2 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50">
                            {UNIT_CHOICES.map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}
                          </select></label>
                        {canCost && (
                          <>
                            <label className="flex flex-col gap-1 text-[12px] text-ink-2">Pack ({prod.base_unit})
                              <input value={prod.pack_size} onChange={(e) => setProd({ ...prod, pack_size: e.target.value.replace(/[^\d.,]/g, '') })} className="w-20 rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
                            <label className="flex flex-col gap-1 text-[12px] text-ink-2">Precio pack (€)
                              <input value={prod.pack_price} onChange={(e) => setProd({ ...prod, pack_price: e.target.value.replace(/[^\d.,]/g, '') })} className="w-24 rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
                          </>
                        )}
                        <button onClick={() => addProduct(s.id)} className="inline-flex h-9 items-center rounded-lg bg-ember px-3 text-[13px] font-medium text-cream hover:bg-ember-hi">Añadir</button>
                      </div>
                    )}

                    {(s.products || []).length ? (
                      <div className="mt-3 overflow-hidden rounded-lg border border-steel-200">
                        {s.products.map((p, i) => (
                          <div key={p.id} className={`bg-white ${i ? 'border-t border-steel-200' : ''}`}>
                            {prodEdit && prodEdit.id === p.id ? (
                              <div className="flex flex-wrap items-end gap-2 p-3">
                                <input value={prodEdit.name} onChange={(e) => setProdEdit({ ...prodEdit, name: e.target.value })} className="w-40 rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" />
                                <select value={prodEdit.base_unit} onChange={(e) => setProdEdit({ ...prodEdit, base_unit: e.target.value })} className="rounded-lg border border-steel-300 px-2 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50">
                                  {UNIT_CHOICES.map(([v, l]) => <option key={v} value={v}>{l} ({v})</option>)}
                                </select>
                                {canCost && <input value={prodEdit.pack_size} onChange={(e) => setProdEdit({ ...prodEdit, pack_size: e.target.value.replace(/[^\d.,]/g, '') })} placeholder="Pack" className="w-16 rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" />}
                                {canCost && <input value={prodEdit.pack_price} onChange={(e) => setProdEdit({ ...prodEdit, pack_price: e.target.value.replace(/[^\d.,]/g, '') })} placeholder="Precio €" className="w-24 rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" />}
                                <button onClick={saveProdEdit} className="inline-flex h-8 items-center rounded-lg bg-ember px-3 text-[12px] font-medium text-cream hover:bg-ember-hi">Guardar</button>
                                <button onClick={() => setProdEdit(null)} className="inline-flex h-8 items-center rounded-lg steel-plate px-3 text-[12px] text-ink hover:bg-white">Cancelar</button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-3 px-3 py-2">
                                <span className="flex-1 text-[13px] text-ink">{p.name}</span>
                                {canCost && <span className="data text-[12px] text-ink-2">{p.unit_cost != null ? `${p.unit_cost} €/${p.base_unit}` : `— /${p.base_unit}`}</span>}
                                {canEdit && <button onClick={() => setProdEdit({ id: p.id, name: p.name, base_unit: p.base_unit, pack_size: p.pack_size ?? '1', pack_price: p.pack_price ?? '' })} title="Editar" className="text-ink-3 hover:text-ink"><Pencil size={14} /></button>}
                                {canEdit && <button onClick={() => removeProduct(p.id)} title="Quitar" className="text-ink-3 hover:text-danger"><Trash size={14} /></button>}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : <p className="mt-3 text-[12px] text-ink-3">Aún no hay productos de este proveedor.</p>}
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
          <p className="mt-1 text-[13px] text-ink-2">{canEdit ? 'Añade tu primer proveedor y sus productos con precio.' : 'Cuando se añadan proveedores, aparecerán aquí.'}</p>
        </div>
      )}
    </div>
  )
}

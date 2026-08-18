import { useEffect, useState } from 'react'
import { listSuppliers, createSupplier, updateSupplier, deleteSupplier } from '../lib/catalog'
import { Truck, Plus, Pencil, Trash, X } from './icons'

const EMPTY = { name: '', contact_name: '', email: '', phone: '', notes: '' }

export default function ProveedoresSection({ canEdit }) {
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | id
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)

  const load = () => {
    setLoading(true)
    listSuppliers().then((data) => { setRows(data); setError('') })
      .catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])

  const openNew = () => { setForm(EMPTY); setEditing('new') }
  const openEdit = (s) => { setForm({ name: s.name, contact_name: s.contact_name, email: s.email, phone: s.phone, notes: s.notes }); setEditing(s.id) }
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
    if (!window.confirm(`¿Eliminar el proveedor "${s.name}"? Los productos quedarán sin proveedor.`)) return
    try { await deleteSupplier(s.id); load() } catch (e) { setError(e.message) }
  }

  const field = (k, label, type = 'text') => (
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
          <h1 className="rf-cond text-3xl uppercase tracking-tight text-ink" style={{ fontWeight: 600 }}>Proveedores</h1>
          <p className="mt-1 text-sm text-ink-2">Tus proveedores y sus datos de contacto. Cada producto del inventario puede tener un proveedor.</p>
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
          <div className="grid gap-3 sm:grid-cols-2">
            {field('name', 'Nombre *')}
            {field('contact_name', 'Persona de contacto')}
            {field('email', 'Email', 'email')}
            {field('phone', 'Teléfono')}
          </div>
          <label className="mt-3 flex flex-col gap-1 text-[13px] text-ink-2">
            Notas
            <textarea rows="2" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" />
          </label>
          <div className="mt-4 flex gap-2">
            <button disabled={saving} onClick={save} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar'}</button>
            <button onClick={close} className="inline-flex h-10 items-center rounded-lg steel-plate px-4 text-sm font-medium text-ink hover:bg-white">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="text-sm text-ink-3">Cargando…</p>
      ) : rows.length ? (
        <div className="overflow-hidden rounded-2xl steel-plate">
          {rows.map((s, i) => (
            <div key={s.id} className={`flex items-center gap-4 px-4 py-3.5 sm:px-5 ${i ? 'border-t border-steel-200' : ''}`}>
              <div className="grid h-11 w-11 flex-none place-items-center rounded-full bg-soot text-cream"><Truck size={18} /></div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{s.name}</p>
                <p className="truncate text-[12px] text-ink-2">
                  {[s.contact_name, s.phone, s.email].filter(Boolean).join(' · ') || 'Sin datos de contacto'}
                </p>
              </div>
              <span className="hidden rounded-full bg-steel-200 px-2.5 py-1 text-[11px] font-medium text-ink-2 sm:inline-flex">
                <span className="data mr-1">{s.product_count}</span> productos
              </span>
              {canEdit && (
                <>
                  <button onClick={() => openEdit(s)} title="Editar" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-steel-100 hover:text-ink"><Pencil size={16} /></button>
                  <button onClick={() => remove(s)} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={16} /></button>
                </>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="steel-plate grid place-items-center rounded-2xl py-16 text-center">
          <Truck size={28} className="text-ink-3" />
          <p className="pass-title mt-3 text-[18px] text-ink">Aún no hay proveedores</p>
          <p className="mt-1 text-[13px] text-ink-2">{canEdit ? 'Añade tu primer proveedor para organizar tus compras.' : 'Cuando se añadan proveedores, aparecerán aquí.'}</p>
        </div>
      )}
    </div>
  )
}

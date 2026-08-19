import { useEffect, useState } from 'react'
import {
  listInsumos, createInsumo, updateInsumo, deleteInsumo,
  createFormato, deleteFormato, registerPrice,
  BASE_UNITS, USE_UNITS,
} from '../../lib/costeo'
import { listSuppliers } from '../../lib/catalog'
import { Coins, Plus, Pencil, Trash, X } from '../icons'

const EMPTY_INS = { name: '', base_unit: 'g', density_g_per_ml: '', weight_per_piece_g: '', cleaning_yield: '1', cooking_yield: '1' }
const EMPTY_FMT = { description: '', supplier: '', pack_text: '', unit_size: '1', unit_size_unit: 'kg', price: '', price_includes_iva: false, iva_rate: '0.10' }

const packToArray = (s) => (s || '').split(/[×x,\s]+/).map((n) => n.trim()).filter(Boolean).map(Number).filter((n) => n > 0)

export default function InsumosPanel({ canEdit }) {
  const [rows, setRows] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(null) // null | 'new' | id
  const [form, setForm] = useState(EMPTY_INS)
  const [expanded, setExpanded] = useState(null)
  const [fmtFor, setFmtFor] = useState(null)   // insumo id al que se añade formato
  const [fmt, setFmt] = useState(EMPTY_FMT)

  const load = () => {
    setLoading(true)
    listInsumos().then((d) => { setRows(d); setError('') }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  useEffect(load, [])
  useEffect(() => { listSuppliers().then(setSuppliers).catch(() => {}) }, [])

  const openNew = () => { setForm(EMPTY_INS); setEditing('new') }
  const openEdit = (i) => {
    setForm({
      name: i.name, base_unit: i.base_unit,
      density_g_per_ml: i.density_g_per_ml ?? '', weight_per_piece_g: i.weight_per_piece_g ?? '',
      cleaning_yield: String(i.cleaning_yield ?? '1'), cooking_yield: String(i.cooking_yield ?? '1'),
    })
    setEditing(i.id)
  }
  const close = () => { setEditing(null); setForm(EMPTY_INS) }

  const save = async () => {
    if (!form.name.trim()) { setError('El insumo necesita un nombre.'); return }
    const body = {
      name: form.name, base_unit: form.base_unit,
      density_g_per_ml: form.density_g_per_ml || null, weight_per_piece_g: form.weight_per_piece_g || null,
      cleaning_yield: form.cleaning_yield || '1', cooking_yield: form.cooking_yield || '1',
    }
    try {
      if (editing === 'new') await createInsumo(body)
      else await updateInsumo(editing, body)
      close(); load()
    } catch (e) { setError(e.message) }
  }
  const remove = async (i) => {
    if (!window.confirm(`¿Eliminar el insumo "${i.name}"?`)) return
    try { await deleteInsumo(i.id); load() } catch (e) { setError(e.message) }
  }

  const addFormato = async (insumoId) => {
    const levels = packToArray(fmt.pack_text)
    if (!fmt.price) { setError('El formato necesita un precio.'); return }
    try {
      await createFormato({
        insumo: insumoId, supplier: fmt.supplier || null, description: fmt.description,
        pack_levels: levels, unit_size: fmt.unit_size || '1', unit_size_unit: fmt.unit_size_unit,
        price: fmt.price, price_includes_iva: fmt.price_includes_iva, iva_rate: fmt.iva_rate || '0.10',
      })
      setFmt(EMPTY_FMT); setFmtFor(null); load()
    } catch (e) { setError(e.message) }
  }
  const setReference = async (insumoId, formatId) => {
    try { await updateInsumo(insumoId, { reference_format: formatId }); load() } catch (e) { setError(e.message) }
  }
  const bumpPrice = async (f) => {
    const p = window.prompt('Nuevo precio del formato (€):', f.price)
    if (p == null) return
    try { await registerPrice(f.id, { price: p, price_includes_iva: f.price_includes_iva, iva_rate: f.iva_rate }); load() } catch (e) { setError(e.message) }
  }
  const removeFormato = async (id) => {
    if (!window.confirm('¿Quitar este formato?')) return
    try { await deleteFormato(id); load() } catch (e) { setError(e.message) }
  }

  const inp = (k, label, ph = '') => (
    <label className="flex flex-col gap-1 text-[13px] text-ink-2">{label}
      <input value={form[k]} placeholder={ph} onChange={(e) => setForm({ ...form, [k]: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
  )

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-2">Materia prima con su unidad base y sus formatos de compra. El precio del formato de referencia alimenta el escandallo.</p>
        {canEdit && <button onClick={openNew} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi"><Plus size={16} /> Nuevo insumo</button>}
      </div>

      {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">{error}</div>}

      {editing && (
        <div className="mb-6 rounded-2xl steel-plate p-5">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="pass-title text-[16px] text-ink">{editing === 'new' ? 'Nuevo insumo' : 'Editar insumo'}</h3>
            <button onClick={close} className="text-ink-3 hover:text-ink"><X size={18} /></button>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {inp('name', 'Nombre *')}
            <label className="flex flex-col gap-1 text-[13px] text-ink-2">Unidad base
              <select value={form.base_unit} onChange={(e) => setForm({ ...form, base_unit: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                {BASE_UNITS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select></label>
            {inp('density_g_per_ml', 'Densidad (g/ml)', 'p. ej. 0,92 (aceite)')}
            {inp('weight_per_piece_g', 'Peso por pieza (g/ud)', 'p. ej. 60 (huevo)')}
            {inp('cleaning_yield', 'Rend. limpieza (0–1)', '1 = sin merma')}
            {inp('cooking_yield', 'Rend. cocción (0–1)', '1 = sin merma')}
          </div>
          <div className="mt-4 flex gap-2">
            <button onClick={save} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi">Guardar</button>
            <button onClick={close} className="inline-flex h-10 items-center rounded-lg steel-plate px-4 text-sm font-medium text-ink hover:bg-white">Cancelar</button>
          </div>
        </div>
      )}

      {loading ? <p className="text-sm text-ink-3">Cargando…</p> : rows.length ? (
        <div className="space-y-3">
          {rows.map((i) => {
            const open = expanded === i.id
            return (
              <div key={i.id} className="overflow-hidden rounded-2xl steel-plate">
                <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
                  <button onClick={() => setExpanded(open ? null : i.id)} className="min-w-0 flex-1 text-left">
                    <p className="truncate text-[14px] font-medium text-ink">{i.name}</p>
                    <p className="text-[12px] text-ink-3">unidad base: {i.base_unit}{i.cost_per_base ? ` · ${Number(i.cost_per_base).toFixed(4)} €/${i.base_unit}` : ' · sin precio'}</p>
                  </button>
                  <span className="hidden rounded-full bg-steel-200 px-2.5 py-1 text-[11px] font-medium text-ink-2 sm:inline-flex"><span className="data mr-1">{i.formats?.length || 0}</span> formatos</span>
                  {canEdit && <>
                    <button onClick={() => openEdit(i)} title="Editar" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-steel-100 hover:text-ink"><Pencil size={16} /></button>
                    <button onClick={() => remove(i)} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={16} /></button>
                  </>}
                </div>

                {open && (
                  <div className="border-t border-steel-200 bg-steel-50/60 px-4 py-4 sm:px-5">
                    <div className="flex items-center justify-between">
                      <p className="pass-title text-[13px] text-ink">Formatos de compra</p>
                      {canEdit && <button onClick={() => { setFmtFor(fmtFor === i.id ? null : i.id); setFmt({ ...EMPTY_FMT, unit_size_unit: i.base_unit === 'ud' ? 'ud' : (i.base_unit === 'ml' ? 'l' : 'kg') }) }} className="inline-flex items-center gap-1 rounded-lg steel-plate px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-white"><Plus size={14} /> Añadir formato</button>}
                    </div>

                    {fmtFor === i.id && (
                      <div className="mt-2 grid gap-2 rounded-lg border border-steel-300 bg-white p-3 sm:grid-cols-2 lg:grid-cols-4">
                        <label className="flex flex-col gap-1 text-[12px] text-ink-2 lg:col-span-2">Descripción
                          <input value={fmt.description} onChange={(e) => setFmt({ ...fmt, description: e.target.value })} placeholder="p. ej. Pack 6×1 L" className="rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
                        <label className="flex flex-col gap-1 text-[12px] text-ink-2">Proveedor
                          <select value={fmt.supplier} onChange={(e) => setFmt({ ...fmt, supplier: e.target.value })} className="rounded-lg border border-steel-300 px-2 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50">
                            <option value="">—</option>
                            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                          </select></label>
                        <label className="flex flex-col gap-1 text-[12px] text-ink-2">Niveles (caja×pack)
                          <input value={fmt.pack_text} onChange={(e) => setFmt({ ...fmt, pack_text: e.target.value })} placeholder="6  ·  12×6" className="rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
                        <label className="flex flex-col gap-1 text-[12px] text-ink-2">Tamaño unidad
                          <input value={fmt.unit_size} onChange={(e) => setFmt({ ...fmt, unit_size: e.target.value.replace(/[^\d.,]/g, '') })} className="rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
                        <label className="flex flex-col gap-1 text-[12px] text-ink-2">Unidad
                          <select value={fmt.unit_size_unit} onChange={(e) => setFmt({ ...fmt, unit_size_unit: e.target.value })} className="rounded-lg border border-steel-300 px-2 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50">
                            {USE_UNITS.map(([v]) => <option key={v} value={v}>{v}</option>)}
                          </select></label>
                        <label className="flex flex-col gap-1 text-[12px] text-ink-2">Precio (€)
                          <input value={fmt.price} onChange={(e) => setFmt({ ...fmt, price: e.target.value.replace(/[^\d.,]/g, '') })} className="rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
                        <label className="flex items-center gap-1.5 self-end text-[12px] text-ink-2"><input type="checkbox" checked={fmt.price_includes_iva} onChange={(e) => setFmt({ ...fmt, price_includes_iva: e.target.checked })} className="accent-[#e8531f]" /> Precio con IVA</label>
                        <div className="flex items-end"><button onClick={() => addFormato(i.id)} className="inline-flex h-9 items-center rounded-lg bg-ember px-3 text-[13px] font-medium text-cream hover:bg-ember-hi">Añadir</button></div>
                      </div>
                    )}

                    {(i.formats || []).length ? (
                      <div className="mt-3 overflow-hidden rounded-lg border border-steel-200">
                        {i.formats.map((f, idx) => {
                          const isRef = i.reference_format === f.id
                          return (
                            <div key={f.id} className={`flex flex-wrap items-center gap-3 bg-white px-3 py-2 ${idx ? 'border-t border-steel-200' : ''}`}>
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-[13px] text-ink">{f.description || 'Formato'} {isRef && <span className="ml-1 rounded-full bg-ember/12 px-2 py-0.5 text-[10px] font-semibold uppercase text-ember-deep">referencia</span>}</p>
                                <p className="text-[11px] text-ink-3">{f.supplier_name ? `${f.supplier_name} · ` : ''}{f.price} €{f.price_includes_iva ? ' (con IVA)' : ''} · contenido {f.content_base ?? '—'} {i.base_unit}</p>
                              </div>
                              <span className="data text-[12px] text-ink-2">{f.cost_per_base != null ? `${Number(f.cost_per_base).toFixed(4)} €/${i.base_unit}` : '—'}</span>
                              {canEdit && <>
                                {!isRef && <button onClick={() => setReference(i.id, f.id)} className="rounded-lg steel-plate px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-white">Usar</button>}
                                <button onClick={() => bumpPrice(f)} title="Registrar precio" className="rounded-lg steel-plate px-2.5 py-1 text-[11px] font-medium text-ink hover:bg-white">Precio</button>
                                <button onClick={() => removeFormato(f.id)} className="text-ink-3 hover:text-danger"><Trash size={14} /></button>
                              </>}
                            </div>
                          )
                        })}
                      </div>
                    ) : <p className="mt-3 text-[12px] text-ink-3">Aún no hay formatos. Añade uno para tener precio.</p>}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      ) : (
        <div className="steel-plate grid place-items-center rounded-2xl py-16 text-center">
          <Coins size={28} className="text-ink-3" />
          <p className="pass-title mt-3 text-[18px] text-ink">Aún no hay insumos</p>
          <p className="mt-1 text-[13px] text-ink-2">Da de alta tu materia prima y sus formatos de compra para calcular escandallos.</p>
        </div>
      )}
    </div>
  )
}

import { useState } from 'react'
import { PRICE_PER, USE_UNITS, buildFormatContent } from '../../lib/costeo'

// Valores por defecto de un formato de compra.
export const EMPTY_FMT = {
  description: '', supplier: '', price_por: 'kg',
  pack_count: '', pack_size: '1', pack_unit: 'kg',
  price: '', price_includes_iva: false, iva_rate: '0.10',
}

// Construye el objeto de formato listo para crear en el backend (o encolar).
export function fmtToBody(f) {
  const content = buildFormatContent({
    pricePer: f.price_por, boxCount: '', packCount: f.pack_count,
    packSize: f.pack_size, packUnit: f.pack_unit,
  })
  return {
    supplier: f.supplier || null, description: f.description,
    price: f.price, price_includes_iva: f.price_includes_iva, iva_rate: f.iva_rate || '0.10',
    pack_levels: content.pack_levels, unit_size: content.unit_size, unit_size_unit: content.unit_size_unit,
    price_por: f.price_por,
  }
}

// Formulario de un formato de compra (siempre visible, sin desplegar). Al pulsar
// "Añadir" entrega el formato a `onAdd` y se limpia. Se comparte entre
// "Insumos y precios" y "Proveedores" para manejar la MISMA información.
export default function FormatoForm({ suppliers = [], onAdd, lockedSupplier = null, compact = false }) {
  const [fmt, setFmt] = useState(EMPTY_FMT)
  const set = (k, v) => setFmt((f) => ({ ...f, [k]: v }))

  const add = () => {
    if (!fmt.price) return
    onAdd({ ...fmt, supplier: lockedSupplier != null ? String(lockedSupplier) : fmt.supplier })
    setFmt(EMPTY_FMT)
  }

  return (
    <div className={`rounded-lg border border-steel-300 bg-white ${compact ? 'p-2.5' : 'p-3'}`}>
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
        <label className="flex flex-col gap-1 text-[12px] text-ink-2">Precio por
          <select value={fmt.price_por} onChange={(e) => { const v = e.target.value; setFmt((f) => ({ ...f, price_por: v, pack_unit: v === 'pack' ? f.pack_unit : v })) }} className="rounded-lg border border-steel-300 px-2 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50">
            {PRICE_PER.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select></label>
        <label className="flex flex-col gap-1 text-[12px] text-ink-2">Precio (€)
          <input value={fmt.price} onChange={(e) => set('price', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="p. ej. 11.40" className="rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
        {lockedSupplier == null ? (
          <label className="flex flex-col gap-1 text-[12px] text-ink-2">Proveedor
            <select value={fmt.supplier} onChange={(e) => set('supplier', e.target.value)} className="rounded-lg border border-steel-300 px-2 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50">
              <option value="">—</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select></label>
        ) : <div className="hidden lg:block" />}
        <label className="flex items-center gap-1.5 self-end pb-1.5 text-[12px] text-ink-2"><input type="checkbox" checked={fmt.price_includes_iva} onChange={(e) => set('price_includes_iva', e.target.checked)} className="accent-[#e8531f]" /> Precio con IVA</label>
      </div>

      {fmt.price_por === 'pack' && (
        <div className="mt-2 grid items-end gap-2 sm:grid-cols-3">
          <label className="flex flex-col gap-1 text-[12px] text-ink-2">El pack trae
            <input value={fmt.pack_count} onChange={(e) => set('pack_count', e.target.value.replace(/[^\d]/g, ''))} placeholder="6" className="rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-2">de tamaño
            <input value={fmt.pack_size} onChange={(e) => set('pack_size', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="1" className="rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-2">unidad
            <select value={fmt.pack_unit} onChange={(e) => set('pack_unit', e.target.value)} className="rounded-lg border border-steel-300 px-2 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50">
              {USE_UNITS.filter(([v]) => v !== 'pack').map(([v]) => <option key={v} value={v}>{v}</option>)}
            </select></label>
        </div>
      )}

      <div className="mt-2 flex items-center gap-2">
        <input value={fmt.description} onChange={(e) => set('description', e.target.value)} placeholder="Descripción (opcional)" className="flex-1 rounded-lg border border-steel-300 px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" />
        <button type="button" onClick={add} disabled={!fmt.price} className="inline-flex h-9 items-center rounded-lg bg-ember px-3 text-[13px] font-medium text-cream hover:bg-ember-hi disabled:opacity-50">Añadir</button>
      </div>
    </div>
  )
}

import { eur, numTrim, priceLabel } from '../../lib/costeo'
import { X } from '../icons'

// Vista previa de solo lectura de un insumo con sus formatos y precios, detallada
// y fácil de leer. Se comparte entre «Insumos y precios» y «Proveedores».
export default function InsumoPreview({ insumo, onClose }) {
  if (!insumo) return null
  const fmts = insumo.formats || []
  const ref = fmts.find((f) => insumo.reference_format === f.id)
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-soot/50 p-4" onClick={onClose}>
      <div className="w-full max-w-xl overflow-hidden rounded-2xl bg-cream shadow-[var(--shadow-forge)]" onClick={(e) => e.stopPropagation()}>
        {/* Cabecera */}
        <div className="hot-zone flex items-start justify-between gap-3 px-5 py-4 text-cream">
          <div className="min-w-0">
            <p className="pass-title text-[12px] tracking-[0.12em] text-cream-dim">Insumo</p>
            <h3 className="pass-title truncate text-[22px] text-cream">{insumo.name}</h3>
            <p className="mt-1 text-[12px] text-cream-dim">
              {fmts.length} {fmts.length === 1 ? 'formato de compra' : 'formatos de compra'}
              {ref?.supplier_name ? ` · referencia de ${ref.supplier_name}` : ''}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="pass-title text-[11px] tracking-[0.1em] text-cream-dim">Coste de referencia</p>
            <p className="data text-[18px] font-semibold text-cream">{priceLabel(insumo) || '—'}</p>
            <button onClick={onClose} className="mt-1 text-cream-dim hover:text-cream"><X size={18} /></button>
          </div>
        </div>

        {/* Formatos */}
        <div className="max-h-[60vh] overflow-y-auto p-5">
          {fmts.length ? (
            <div className="space-y-2.5">
              {fmts.map((f) => {
                const isRef = insumo.reference_format === f.id
                const packLabel = `${(f.pack_levels || []).join(' × ') || '1'} × ${numTrim(f.unit_size)} ${f.unit_size_unit}`
                return (
                  <div key={f.id} className={`rounded-xl border p-3 ${isRef ? 'border-ember/40 bg-ember/[.06]' : 'border-steel-200 bg-white'}`}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-medium text-ink">
                          {f.description || 'Formato'}
                          {isRef && <span className="ml-2 rounded-full bg-ember/15 px-2 py-0.5 text-[10px] font-semibold uppercase text-ember-deep">referencia</span>}
                        </p>
                        <p className="mt-0.5 text-[12px] text-ink-3">{f.supplier_name || 'Sin proveedor'}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="data text-[15px] font-semibold text-ink">{priceLabel(f) || '—'}</p>
                        <p className="text-[11px] text-ink-3">coste por unidad de uso</p>
                      </div>
                    </div>
                    <dl className="mt-2.5 grid grid-cols-2 gap-x-4 gap-y-1 border-t border-steel-200/70 pt-2.5 text-[12px] sm:grid-cols-3">
                      <div><dt className="text-ink-3">Precio de compra</dt><dd className="data text-ink">{eur(f.price)}{f.price_includes_iva ? ' (con IVA)' : ' (sin IVA)'}</dd></div>
                      <div><dt className="text-ink-3">Presentación</dt><dd className="data text-ink">{packLabel}</dd></div>
                      <div><dt className="text-ink-3">IVA</dt><dd className="data text-ink">{numTrim((Number(f.iva_rate ?? 0) * 100).toFixed(2))}%</dd></div>
                    </dl>
                  </div>
                )
              })}
            </div>
          ) : <p className="text-[13px] text-ink-2">Este insumo aún no tiene formatos de compra.</p>}
        </div>
      </div>
    </div>
  )
}

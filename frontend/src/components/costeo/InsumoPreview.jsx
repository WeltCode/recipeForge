import { eur, numTrim, priceLabel } from '../../lib/costeo'
import { X } from '../icons'

// Vista previa de solo lectura de un insumo con sus formatos y precios. Se
// comparte entre «Insumos y precios» y «Proveedores».
export default function InsumoPreview({ insumo, onClose }) {
  if (!insumo) return null
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

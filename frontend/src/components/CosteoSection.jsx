import { useState } from 'react'
import EscandallosPanel from './costeo/EscandallosPanel'
import InsumosPanel from './costeo/InsumosPanel'

// Sección "Escandallo" (motor `costeo`): escandallos con coste en vivo + el
// catálogo de insumos y sus formatos de compra.
export default function CosteoSection({ canEdit }) {
  const [tab, setTab] = useState('escandallos')
  return (
    <div className="pb-6">
      <div className="mb-6">
        <h1 className="rf-cond text-3xl uppercase tracking-tight text-ink" style={{ fontWeight: 600 }}>Escandallo</h1>
        <p className="mt-1 text-sm text-ink-2">Coste real de materia prima: da de alta el insumo una vez y cualquier plato se calcula solo.</p>
      </div>
      <div className="mb-6 inline-flex rounded-lg steel-plate p-1">
        {[['escandallos', 'Escandallos'], ['insumos', 'Insumos y precios']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`h-9 rounded-md px-4 text-[13px] font-medium transition-colors ${tab === id ? 'bg-soot text-cream' : 'text-ink-2 hover:text-ink'}`}>{label}</button>
        ))}
      </div>
      {tab === 'escandallos' ? <EscandallosPanel canEdit={canEdit} /> : <InsumosPanel canEdit={canEdit} />}
    </div>
  )
}

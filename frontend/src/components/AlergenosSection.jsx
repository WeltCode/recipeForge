import { useMemo, useState } from 'react'
import { ALLERGEN_LIST, AllergenDisc } from '../lib/allergens'
import { Search, X, Allergen } from './icons'

// Sección "Alérgenos" (Premium): leyenda de los 14 UE + matriz del recetario.
// El etiquetado se hace por ingrediente en el editor de cada receta; aquí se
// consulta el resultado (sello por receta) y la matriz completa.
export default function AlergenosSection({ recipes }) {
  const [q, setQ] = useState('')

  const filtered = useMemo(() => {
    const query = q.trim().toLowerCase()
    if (!query) return recipes
    return recipes.filter((r) => [r.name, r.code].filter(Boolean).some((v) => v.toLowerCase().includes(query)))
  }, [recipes, q])

  return (
    <div className="pb-6">
      <div className="mb-6">
        <h1 className="rf-cond text-3xl uppercase tracking-tight text-ink" style={{ fontWeight: 600 }}>Alérgenos</h1>
        <p className="mt-1 text-sm text-ink-2">Los 14 de declaración obligatoria (UE). Se etiquetan por ingrediente al editar cada receta.</p>
      </div>

      {/* Leyenda */}
      <div className="mb-6 rounded-2xl steel-plate p-5">
        <h2 className="pass-title mb-3 text-[15px] text-ink">Leyenda</h2>
        <div className="flex flex-wrap gap-x-5 gap-y-2.5">
          {ALLERGEN_LIST.map((a) => (
            <span key={a.key} className="inline-flex items-center gap-2 text-[13px] text-ink-2">
              <AllergenDisc id={a.key} size={26} /> {a.nombre}
            </span>
          ))}
        </div>
      </div>

      {/* Buscador */}
      <div className="mb-4 flex h-11 max-w-md items-center gap-2 rounded-lg steel-plate px-3">
        <Search size={18} className="text-ink-3" />
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Buscar receta o código…" className="w-full bg-transparent text-[14px] text-ink outline-none placeholder:text-ink-3" />
        {q && <button onClick={() => setQ('')} className="text-ink-3 hover:text-ink"><X size={16} /></button>}
      </div>

      {/* Matriz receta × alérgeno */}
      {filtered.length ? (
        <div className="overflow-x-auto rounded-2xl steel-plate">
          <table className="w-full min-w-[900px] border-collapse">
            <thead>
              <tr className="border-b border-steel-300">
                <th className="sticky left-0 z-10 bg-steel-50 p-3 text-left text-[11px] font-medium uppercase tracking-wide text-ink-3">Receta</th>
                {ALLERGEN_LIST.map((a) => (
                  <th key={a.key} className="p-2 text-center text-[10px] font-medium text-ink-3" title={a.nombre}>{a.glyph}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r) => (
                <tr key={r.id} className="border-b border-steel-200 last:border-0 hover:bg-steel-50">
                  <td className="sticky left-0 z-10 bg-steel-50 p-3">
                    <p className="whitespace-nowrap text-[13px] font-medium text-ink">{r.name}</p>
                    <p className="data text-[11px] text-ink-3">{r.code}</p>
                  </td>
                  {ALLERGEN_LIST.map((a) => (
                    <td key={a.key} className="p-2 text-center">
                      <span className={`mx-auto block h-2.5 w-2.5 rounded-full ${(r.allergen_summary || []).includes(a.key) ? 'bg-ember' : 'bg-steel-200'}`} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="steel-plate grid place-items-center rounded-2xl py-16 text-center">
          <Allergen size={28} className="text-ink-3" />
          <p className="pass-title mt-3 text-[18px] text-ink">{recipes.length === 0 ? 'Aún no hay recetas' : 'Sin resultados'}</p>
          <p className="mt-1 text-[13px] text-ink-2">Etiqueta los alérgenos por ingrediente al crear o editar una receta.</p>
        </div>
      )}
    </div>
  )
}


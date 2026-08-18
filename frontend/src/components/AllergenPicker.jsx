import { ALLERGEN_LIST } from '../lib/allergens'

// Selector compacto de alérgenos (los 14 UE) como chips que se activan/desactivan.
export function AllergenPicker({ value = [], onChange }) {
  const set = new Set(value)
  const toggle = (key) => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    // Mantener el orden oficial de los 14.
    onChange(ALLERGEN_LIST.filter((a) => next.has(a.key)).map((a) => a.key))
  }
  return (
    <div className="flex flex-wrap gap-1.5">
      {ALLERGEN_LIST.map((a) => {
        const on = set.has(a.key)
        return (
          <button
            key={a.key}
            type="button"
            title={a.nombre}
            onClick={() => toggle(a.key)}
            className={`inline-flex h-7 items-center gap-1 rounded-full border px-2 text-[11px] font-medium transition ${
              on ? 'border-[#e8531f] bg-[#fff1e9] text-[#b5420f]' : 'border-stone-300 bg-white text-stone-500 hover:border-stone-400'
            }`}
          >
            <span className="font-semibold">{a.glyph}</span>
            <span className="hidden sm:inline">{a.nombre}</span>
          </button>
        )
      })}
    </div>
  )
}


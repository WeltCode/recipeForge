import { ALLERGEN_LIST } from '../lib/allergens'
import { AllergenIcon } from './AllergenIcon'

// Selector de alérgenos (los 14 UE) con icono SVG + nombre. Se activan/desactivan.
export function AllergenPicker({ value = [], onChange }) {
  const set = new Set(value)
  const toggle = (key) => {
    const next = new Set(set)
    next.has(key) ? next.delete(key) : next.add(key)
    onChange(ALLERGEN_LIST.filter((a) => next.has(a.key)).map((a) => a.key))
  }
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
      {ALLERGEN_LIST.map((a) => {
        const on = set.has(a.key)
        return (
          <button
            key={a.key}
            type="button"
            onClick={() => toggle(a.key)}
            aria-pressed={on}
            className={`flex items-center gap-2 rounded-lg border px-2.5 py-2 text-left text-[12.5px] transition ${
              on
                ? 'border-[#e8531f] bg-[#fff1e9] text-[#b5420f]'
                : 'border-stone-300 bg-white text-stone-500 hover:border-stone-400'
            }`}
          >
            <AllergenIcon id={a.key} size={22} className={on ? 'text-[#e8531f]' : 'text-stone-400'} />
            <span className="leading-tight">{a.nombre}</span>
          </button>
        )
      })}
    </div>
  )
}

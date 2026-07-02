// Helpers visuales compartidos de RecipeForge.

export function greeting() {
  const h = new Date().getHours()
  if (h < 6) return 'Buenas noches'
  if (h < 13) return 'Buenos días'
  if (h < 20) return 'Buenas tardes'
  return 'Buenas noches'
}

export function initials(name = '') {
  const parts = name.trim().split(/[\s_-]+/).filter(Boolean)
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase()
  return name.trim().slice(0, 2).toUpperCase() || '?'
}

export function totalTimeLabel(r) {
  const toMin = (v, u) => Number(v || 0) * (u === 'h' ? 60 : 1)
  const t = toMin(r.prep_time_value, r.prep_time_unit) + toMin(r.cook_time_value, r.cook_time_unit)
  if (!t) return '—'
  if (t >= 60) {
    const h = Math.floor(t / 60)
    const m = t % 60
    return m ? `${h}h ${m}min` : `${h}h`
  }
  return `${t} min`
}

// Paleta por categoría: tonos cálidos y terrosos (nada estridente).
// Clases literales para que Tailwind las detecte.
const CATEGORY_PALETTE = [
  { chip: 'bg-orange-100/70 text-orange-800', dot: 'bg-orange-400', grad: 'from-orange-300 to-amber-400' },
  { chip: 'bg-amber-100/70 text-amber-800', dot: 'bg-amber-400', grad: 'from-amber-300 to-yellow-400' },
  { chip: 'bg-red-100/70 text-red-800', dot: 'bg-red-400', grad: 'from-red-300 to-orange-400' },
  { chip: 'bg-rose-100/70 text-rose-800', dot: 'bg-rose-400', grad: 'from-rose-300 to-red-300' },
  { chip: 'bg-yellow-100/70 text-yellow-800', dot: 'bg-yellow-500', grad: 'from-yellow-300 to-amber-400' },
  { chip: 'bg-orange-200/60 text-orange-900', dot: 'bg-orange-500', grad: 'from-orange-300 to-rose-300' },
  { chip: 'bg-amber-100 text-amber-900', dot: 'bg-amber-600', grad: 'from-amber-500 to-orange-600' },
  { chip: 'bg-red-100/60 text-red-900', dot: 'bg-red-500', grad: 'from-red-300 to-amber-400' },
]

const NEUTRAL = { chip: 'bg-stone-200 text-stone-600', dot: 'bg-stone-400', grad: 'from-stone-300 to-stone-400' }

export function categoryStyle(cat) {
  if (!cat) return NEUTRAL
  let h = 0
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length]
}

// Capa decorativa de brasas ascendentes (para hero oscuros).
export function Embers({ count = 14 }) {
  const items = Array.from({ length: count })
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
      {items.map((_, i) => {
        const left = (i * 37 + 7) % 100
        const dur = 5 + ((i * 13) % 7)
        const delay = (i * 17) % 9
        const size = 3 + ((i * 7) % 4)
        return (
          <span
            key={i}
            className="rf-ember"
            style={{
              left: `${left}%`,
              width: size,
              height: size,
              animationDuration: `${dur}s`,
              animationDelay: `${delay}s`,
            }}
          />
        )
      })}
    </div>
  )
}

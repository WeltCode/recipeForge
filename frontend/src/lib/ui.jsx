// Helpers visuales compartidos de RecipeForge.

// Convierte texto (con coma o punto) a número; '' o inválido -> null.
export function parseDecimal(v) {
  if (v === '' || v == null) return null
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? null : n
}

// Formatea un número para mostrar: coma decimal, sin ceros sobrantes.
// 5.5 -> "5,5" | 20 -> "20" | "1.30" -> "1,3"
export function fmtDecimal(v) {
  if (v === '' || v == null) return ''
  const n = parseFloat(String(v).replace(',', '.'))
  if (isNaN(n)) return String(v)
  return String(n).replace('.', ',')
}

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

// Paleta por categoría en el mundo "La Línea": el punto de estado es cálido
// (brasa/lámpara/oro); el chip vive sobre acero con tinta oscura.
// Clases literales para que Tailwind las detecte.
const CATEGORY_PALETTE = [
  { chip: 'bg-[#f0ebe4] text-[#7c3d17]', dot: 'bg-[#e8531f]' },
  { chip: 'bg-[#efe9e1] text-[#8a5a12]', dot: 'bg-[#ff9a3d]' },
  { chip: 'bg-[#f0eae2] text-[#8a4a10]', dot: 'bg-[#d89b3a]' },
  { chip: 'bg-[#f1e9e5] text-[#8f3a20]', dot: 'bg-[#c8371a]' },
  { chip: 'bg-[#eeeae3] text-[#6a5b1a]', dot: 'bg-[#c8a11a]' },
  { chip: 'bg-[#f0ebe3] text-[#7a4520]', dot: 'bg-[#f2622c]' },
  { chip: 'bg-[#ebe9e6] text-[#4a4640]', dot: 'bg-[#8a9098]' },
  { chip: 'bg-[#f1e9e4] text-[#853118]', dot: 'bg-[#b03418]' },
]

const NEUTRAL = { chip: 'bg-[#e7e9ec] text-[#5a5650]', dot: 'bg-[#8a9098]' }

export function categoryStyle(cat) {
  if (!cat) return NEUTRAL
  let h = 0
  for (let i = 0; i < cat.length; i++) h = (h * 31 + cat.charCodeAt(i)) >>> 0
  return CATEGORY_PALETTE[h % CATEGORY_PALETTE.length]
}

// Lámpara de estado (punto que brilla, como la lámpara de calor del pase).
export function StatusLamp({ on = true, size = 9, className = '' }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-block shrink-0 rounded-full ${on ? 'rf-lamp-on' : 'bg-[#8a9098]'} ${className}`}
      style={{ width: size, height: size }}
    />
  )
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

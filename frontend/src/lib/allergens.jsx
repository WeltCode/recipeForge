// Los 14 alérgenos de declaración obligatoria (UE, Reglamento 1169/2011).
// `key` estable (coincide con el backend), `nombre` para mostrar, `glyph` =
// abreviatura corta para el disco de señalética.
export const ALLERGENS = {
  gluten: { key: 'gluten', nombre: 'Cereales con gluten', glyph: 'GL' },
  crustaceos: { key: 'crustaceos', nombre: 'Crustáceos', glyph: 'CR' },
  huevos: { key: 'huevos', nombre: 'Huevos', glyph: 'HU' },
  pescado: { key: 'pescado', nombre: 'Pescado', glyph: 'PE' },
  cacahuetes: { key: 'cacahuetes', nombre: 'Cacahuetes', glyph: 'CA' },
  soja: { key: 'soja', nombre: 'Soja', glyph: 'SO' },
  lacteos: { key: 'lacteos', nombre: 'Lácteos', glyph: 'LA' },
  frutos_cascara: { key: 'frutos_cascara', nombre: 'Frutos de cáscara', glyph: 'FC' },
  apio: { key: 'apio', nombre: 'Apio', glyph: 'AP' },
  mostaza: { key: 'mostaza', nombre: 'Mostaza', glyph: 'MO' },
  sesamo: { key: 'sesamo', nombre: 'Granos de sésamo', glyph: 'SE' },
  sulfitos: { key: 'sulfitos', nombre: 'Sulfitos', glyph: 'SU' },
  altramuces: { key: 'altramuces', nombre: 'Altramuces', glyph: 'AL' },
  moluscos: { key: 'moluscos', nombre: 'Moluscos', glyph: 'MC' },
}

// Orden oficial de los 14.
export const ALLERGEN_LIST = Object.values(ALLERGENS)
export const ALLERGEN_KEYS = ALLERGEN_LIST.map((a) => a.key)

// Disco de señalética de un alérgeno (activo = presente).
export function AllergenDisc({ id, size = 28, active = true, title }) {
  const a = ALLERGENS[id]
  if (!a) return null
  return (
    <span
      title={title ?? a.nombre}
      className={`inline-flex items-center justify-center rounded-full border text-[10px] font-semibold tracking-tight ${
        active ? 'border-ember/40 bg-ember/10 text-ember-deep' : 'border-steel-300 bg-steel-100 text-ink-3'
      }`}
      style={{ width: size, height: size }}
    >
      {a.glyph}
    </span>
  )
}

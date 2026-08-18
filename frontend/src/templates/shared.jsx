// Lógica común a todas las plantillas de ficha técnica.
import { fmtDecimal, parseDecimal } from '../lib/ui'
import { ALLERGENS, ALLERGEN_KEYS } from '../lib/allergens'

// Alérgenos presentes en la receta: unión de los declarados en cada línea
// (y los del resumen del backend si viene), en el orden oficial de los 14 UE.
export function recipeAllergens(recipe) {
  const found = new Set(recipe.allergen_summary || [])
  for (const ing of recipe.ingredients || []) {
    for (const a of ing.allergens || []) found.add(a)
  }
  return ALLERGEN_KEYS.filter((k) => found.has(k))
}

// Sello de alérgenos para la ficha impresa (discos + nombres). No renderiza
// nada si la receta no declara alérgenos.
export function AllergenSeal({ recipe, accent = '#c8371a' }) {
  const list = recipeAllergens(recipe)
  if (!list.length) return null
  return (
    <div className="mt-[8px] border-t border-[#e0e0e0] pt-[6px]">
      <p className="rf-mono mb-[4px] text-[9px] uppercase tracking-[0.14em] text-[#999999]">Alérgenos (UE)</p>
      <div className="flex flex-wrap gap-[5px]">
        {list.map((k) => (
          <span
            key={k}
            className="inline-flex items-center gap-[4px] rounded-full border px-[6px] py-[2px] text-[9px] font-semibold"
            style={{ borderColor: accent, color: accent }}
          >
            <span
              className="inline-flex h-[13px] w-[13px] items-center justify-center rounded-full text-[7px] text-white"
              style={{ background: accent }}
            >
              {ALLERGENS[k]?.glyph}
            </span>
            {ALLERGENS[k]?.nombre}
          </span>
        ))}
      </div>
    </div>
  )
}

export function groupIngredients(ingredients = []) {
  const grouped = new Map()
  for (const ing of ingredients) {
    const g = ing.group_name?.trim() || 'Ingredientes'
    const cur = grouped.get(g) ?? []
    cur.push(ing)
    grouped.set(g, cur)
  }
  return Array.from(grouped.entries())
}

export function filterSteps(steps = []) {
  return steps.filter((s) => s.title?.trim() || s.instruction?.trim() || s.tip?.trim())
}

// Cantidad con decimales (coma), sin ceros sobrantes.
export function fmtQty(val) {
  if (val === '' || val == null) return 'c/s'
  const s = fmtDecimal(val)
  return s === '' ? 'c/s' : s
}

export function getPhoto(recipe) {
  return recipe.photoPreviewUrl || recipe.final_photo || null
}

export function revLabel(recipe) {
  return `Rev. 0.${recipe.revision || 1}`
}

export function restaurantName(recipe) {
  return recipe.restaurant_name || 'Restaurante'
}

export function restaurantLogo(recipe) {
  return recipe.restaurant_logo || null
}

// Devuelve las 5 estadísticas ya formateadas.
export function stats(recipe) {
  const shelf = recipe.shelf_life_value
    ? `${recipe.shelf_life_value} ${recipe.shelf_life_unit === 'meses' ? 'meses' : 'días'}`
    : '—'
  const yld = recipe.yield_quantity ? `${fmtQty(recipe.yield_quantity)} ${recipe.yield_unit || 'g'}` : '—'
  const prep = parseDecimal(recipe.prep_time_value)
    ? `${fmtDecimal(recipe.prep_time_value)} ${recipe.prep_time_unit || 'min'}`
    : '—'
  const cook = parseDecimal(recipe.cook_time_value)
    ? `${fmtDecimal(recipe.cook_time_value)} ${recipe.cook_time_unit || 'min'}`
    : '—'
  return [
    { key: 'servings', value: recipe.servings || '—', label: 'Raciones' },
    { key: 'yield', value: yld, label: 'Rendimiento' },
    { key: 'prep', value: prep, label: 'Preparación' },
    { key: 'cook', value: cook, label: 'Cocción' },
    { key: 'shelf', value: shelf, label: 'Vida útil' },
  ]
}

export function monthYear() {
  return new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })
}

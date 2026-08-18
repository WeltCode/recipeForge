import { groupIngredients, filterSteps, fmtQty, getPhoto, revLabel, stats, restaurantName, restaurantLogo, monthYear, AllergenSeal } from './shared'

const INK = '#3a2c1a'
const DEFAULT_GOLD = '#9c6b3f'
const CREAM = '#f8f2e5'

function toRoman(n) {
  const map = [[10, 'X'], [9, 'IX'], [5, 'V'], [4, 'IV'], [1, 'I']]
  let r = ''
  for (const [v, s] of map) while (n >= v) { r += s; n -= v }
  return r || 'I'
}

// Filigrana ornamental original (divisor). Color configurable.
function Flourish({ w = 150, color = DEFAULT_GOLD }) {
  return (
    <svg width={w} height="14" viewBox="0 0 150 14" fill="none" style={{ color }}>
      <path d="M8 7h48" stroke="currentColor" strokeWidth="1" />
      <path d="M94 7h48" stroke="currentColor" strokeWidth="1" />
      <path d="M64 7c3-4 8-4 11 0 3 4 8 4 11 0" stroke="currentColor" strokeWidth="1.2" fill="none" strokeLinecap="round" />
      <path d="M75 2.5l2.4 4.5-2.4 4.5-2.4-4.5z" fill="currentColor" />
    </svg>
  )
}

// PLANTILLA TRADICIONAL — recetario clásico, tipografía serif, tonos pergamino.
export default function TemplateTradicional({ recipe }) {
  const ingredients = groupIngredients(recipe.ingredients)
  const steps = filterSteps(recipe.steps)
  const photo = getPhoto(recipe)
  const logo = restaurantLogo(recipe)
  const rev = revLabel(recipe)
  const gold = recipe.accent_color || DEFAULT_GOLD

  return (
    <div className="rf-a4 shadow-[0_20px_60px_rgba(0,0,0,0.18)]" style={{ background: CREAM, color: INK }}>
      {/* Marco doble clásico */}
      <div className="absolute inset-[10px] border" style={{ borderColor: gold }} />
      <div className="absolute inset-[14px] border-[0.5px]" style={{ borderColor: gold }} />

      <div className="relative flex h-full flex-col px-[34px] py-[28px]">
        {/* CABECERA centrada */}
        <div className="flex flex-col items-center text-center">
          {logo ? <img src={logo} alt="" className="mb-[8px] h-[38px] w-auto object-contain" /> : null}
          <p className="rf-serif text-[10px] uppercase tracking-[0.4em]" style={{ color: gold }}>{restaurantName(recipe)}</p>
          <p className="rf-serif mt-[6px] text-[10px] uppercase tracking-[0.3em] text-[#8a7657]">Ficha Técnica de Cocina</p>
          <div className="my-[8px]"><Flourish color={gold} /></div>
          <h1 className="rf-display text-[34px] font-bold italic leading-[1.05]">{recipe.name || 'Nombre del Plato'}</h1>
          <p className="rf-serif mt-[3px] text-[12px] italic text-[#7a6748]">{recipe.category || 'Categoría'} · {recipe.code || 'FT-000'} · {rev}</p>
        </div>

        {/* Foto + descripción + stats */}
        <div className="mt-[16px] grid gap-[18px]" style={{ gridTemplateColumns: '190px 1fr' }}>
          <div className="p-[5px]" style={{ border: `1px solid ${gold}` }}>
            <div className="flex h-[130px] w-full items-center justify-center overflow-hidden bg-[#efe6d3]">
              {photo ? <img src={photo} alt="" className="h-full w-full object-contain" /> : <div className="flex h-full items-center justify-center rf-serif text-[11px] italic text-[#b7a988]">Sin fotografía</div>}
            </div>
          </div>
          <div className="flex flex-col justify-center">
            <p className="rf-serif text-[12.5px] leading-[1.6] text-[#4a3a24]">{recipe.description || 'Descripción del plato aparecerá aquí.'}</p>
            <div className="mt-[12px] grid grid-cols-5 gap-[4px] border-t pt-[8px]" style={{ borderColor: '#d9c9a8' }}>
              {stats(recipe).map((s) => (
                <div key={s.key} className="text-center">
                  <p className="rf-display text-[14px] font-bold">{s.value}</p>
                  <p className="rf-serif text-[8px] uppercase tracking-[0.1em] text-[#8a7657]">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="my-[14px] flex justify-center"><Flourish w={220} color={gold} /></div>

        {/* Ingredientes + Elaboración */}
        <div className="grid flex-1 gap-[24px] overflow-hidden" style={{ gridTemplateColumns: '215px 1fr' }}>
          <aside className="flex flex-col overflow-hidden" style={{ borderRight: `1px solid #d9c9a8` }}>
            <p className="rf-display mb-[8px] pr-[18px] text-[15px] font-bold italic">Ingredientes</p>
            <div className="space-y-[9px] pr-[18px]">
              {ingredients.length ? ingredients.map(([g, items]) => (
                <div key={g}>
                  <p className="rf-serif mb-[3px] text-[10px] font-semibold uppercase tracking-[0.14em]" style={{ color: gold }}>{g}</p>
                  {items.map((item, idx) => (
                    <div key={idx} className="flex items-baseline gap-[4px] py-[1.5px]">
                      <span className="rf-serif whitespace-nowrap text-[11.5px]">{item.ingredient_name || 'Insumo'}</span>
                      <span className="mx-[2px] flex-1 border-b border-dotted" style={{ borderColor: '#c9b892', transform: 'translateY(-2px)' }} />
                      <span className="rf-serif whitespace-nowrap text-[11px] font-semibold">{fmtQty(item.quantity)} {item.unit || ''}</span>
                    </div>
                  ))}
                </div>
              )) : <p className="rf-serif text-[11px] italic text-[#b7a988]">Los ingredientes aparecerán aquí</p>}
            </div>
            {recipe.observations?.trim() ? (
              <div className="mt-auto pr-[18px] pt-[10px]">
                <p className="rf-serif mb-[2px] text-[9px] font-semibold uppercase tracking-[0.14em]" style={{ color: gold }}>Notas del chef</p>
                <p className="rf-serif text-[10.5px] italic leading-[1.5] text-[#5a4a30]">{recipe.observations}</p>
              </div>
            ) : null}
            <AllergenSeal recipe={recipe} accent={gold} />
          </aside>

          <section className="overflow-hidden">
            <p className="rf-display mb-[10px] text-[15px] font-bold italic">Elaboración</p>
            {steps.length ? (
              <div className="space-y-[11px]">
                {steps.map((step, idx) => (
                  <div key={idx} className="grid gap-[12px]" style={{ gridTemplateColumns: '30px 1fr' }}>
                    <span className="rf-display text-[19px] font-bold" style={{ color: gold }}>{toRoman(idx + 1)}</span>
                    <div className="pt-[2px]">
                      {step.title ? <p className="rf-serif mb-[1px] text-[12px] font-semibold">{step.title}</p> : null}
                      {step.instruction ? <p className="rf-serif text-[11.5px] leading-[1.55] text-[#4a3a24]">{step.instruction}</p> : null}
                      {step.tip ? <p className="rf-serif mt-[3px] text-[10.5px] italic leading-[1.4]" style={{ color: gold }}>❋ {step.tip}</p> : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : <p className="rf-serif text-[11px] italic text-[#b7a988]">Los pasos aparecerán aquí</p>}
          </section>
        </div>

        {/* Pie */}
        <div className="mt-[8px] flex justify-center"><Flourish w={120} color={gold} /></div>
        <p className="rf-serif mt-[4px] text-center text-[9px] uppercase tracking-[0.2em] text-[#8a7657]">{restaurantName(recipe)} · {monthYear()}</p>
      </div>
    </div>
  )
}

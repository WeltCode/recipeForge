import { groupIngredients, filterSteps, fmtQty, getPhoto, revLabel, stats, restaurantName, restaurantLogo, monthYear, AllergenSeal } from './shared'
import { Fork, Scale, Clock, Flame, Calendar } from '../components/icons'

const PRIMARY = '#E2571E'
const INK = '#1b1a18'
const STAT_ICONS = { servings: Fork, yield: Scale, prep: Clock, cook: Flame, shelf: Calendar }

// PLANTILLA MODERNA — editorial, minimalista, con acento cálido y tipografía grande.
export default function TemplateModerna({ recipe }) {
  const ingredients = groupIngredients(recipe.ingredients)
  const steps = filterSteps(recipe.steps)
  const photo = getPhoto(recipe)
  const logo = restaurantLogo(recipe)
  const rev = revLabel(recipe)
  const accent = recipe.accent_color || PRIMARY

  return (
    <div className="rf-a4 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.18)]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", color: INK }}>
      {/* barra de acento */}
      <div style={{ height: 6, background: `linear-gradient(90deg, ${accent}, #f59e0b)` }} />

      {/* HEADER */}
      <div className="flex items-center justify-between px-[26px] pt-[16px] pb-[10px]">
        {logo ? <img src={logo} alt="" className="h-[34px] w-auto object-contain" /> : <span className="text-[15px] font-bold tracking-tight">{restaurantName(recipe)}</span>}
        <div className="text-right">
          <p className="rf-mono text-[9px] uppercase tracking-[0.28em] text-[#b3b0aa]">Ficha Técnica</p>
          <p className="rf-mono mt-[2px] text-[12px] font-medium" style={{ color: accent }}>{recipe.code || 'FT-000'} · {rev}</p>
        </div>
      </div>

      {/* HERO */}
      <div className="grid items-stretch gap-[20px] px-[26px] pb-[16px]" style={{ gridTemplateColumns: '1fr 220px' }}>
        <div className="flex flex-col justify-center">
          <span className="mb-[10px] inline-flex w-fit items-center rounded-full px-[12px] py-[4px] text-[10px] font-semibold uppercase tracking-[0.14em] text-white" style={{ background: accent }}>
            {recipe.category || 'Categoría'}
          </span>
          <h1 className="text-[38px] font-bold leading-[0.98] tracking-[-0.02em]">{recipe.name || 'Nombre del Plato'}</h1>
          <div className="mt-[10px] h-[3px] w-[54px]" style={{ background: accent }} />
          <p className="mt-[10px] text-[12.5px] leading-[1.5] text-[#5c5952]">{recipe.description || 'Descripción del plato aparecerá aquí.'}</p>
        </div>
        <div className="flex items-center justify-center overflow-hidden rounded-[18px] bg-[#f2efea]" style={{ height: 200 }}>
          {photo ? <img src={photo} alt="" className="h-full w-full object-contain" /> : (
            <div className="flex h-full w-full items-center justify-center text-[11px] uppercase tracking-[0.1em] text-[#c4c0b8]">Sin foto</div>
          )}
        </div>
      </div>

      {/* STATS */}
      <div className="mx-[26px] grid grid-cols-5 rounded-[16px] bg-[#f7f5f1] py-[12px]">
        {stats(recipe).map((s, i, arr) => {
          const Icon = STAT_ICONS[s.key] || Fork
          return (
            <div key={s.key} className={`flex flex-col items-center gap-[3px] px-[6px] text-center ${i < arr.length - 1 ? 'border-r border-[#e4e1da]' : ''}`}>
              <Icon size={17} className="text-[#a09a8f]" />
              <span className="mt-[1px] text-[15px] font-bold leading-none">{s.value}</span>
              <span className="text-[8.5px] font-medium uppercase tracking-[0.1em] text-[#a09a8f]">{s.label}</span>
            </div>
          )
        })}
      </div>

      {/* BODY */}
      <div className="grid flex-1 gap-[22px] px-[26px] pb-[14px] pt-[16px]" style={{ gridTemplateColumns: '215px 1fr' }}>
        {/* Ingredientes */}
        <aside className="flex flex-col overflow-hidden">
          <p className="mb-[10px] text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>Ingredientes</p>
          <div className="space-y-[11px]">
            {ingredients.length ? ingredients.map(([g, items]) => (
              <div key={g}>
                <p className="mb-[4px] text-[10px] font-bold uppercase tracking-[0.06em] text-[#8a857c]">{g}</p>
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-baseline gap-[8px] py-[2.5px]">
                    <span className="rf-mono shrink-0 text-[11px] font-semibold" style={{ color: accent, minWidth: 50 }}>{fmtQty(item.quantity)} {item.unit || ''}</span>
                    <span className="text-[11.5px] leading-[1.3]">
                      {item.ingredient_name || 'Insumo'}
                      {item.note ? <span className="block text-[9.5px] italic text-[#a09a8f]">{item.note}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            )) : <p className="text-[11px] text-[#c4c0b8]">Los ingredientes aparecerán aquí</p>}
          </div>
          {recipe.observations?.trim() ? (
            <div className="mt-auto rounded-[12px] bg-[#fbf4ee] px-[12px] py-[9px]" style={{ borderLeft: `3px solid ${accent}` }}>
              <p className="mb-[2px] text-[8.5px] font-bold uppercase tracking-[0.12em]" style={{ color: accent }}>Observaciones</p>
              <p className="text-[10px] leading-[1.4] text-[#5c5952]">{recipe.observations}</p>
            </div>
          ) : null}
          <AllergenSeal recipe={recipe} accent={accent} />
        </aside>

        {/* Proceso */}
        <section className="overflow-hidden">
          <p className="mb-[12px] text-[12px] font-bold uppercase tracking-[0.14em]" style={{ color: accent }}>Elaboración</p>
          {steps.length ? (
            <div className="space-y-[13px]">
              {steps.map((step, idx) => (
                <div key={idx} className="grid gap-[12px]" style={{ gridTemplateColumns: '34px 1fr' }}>
                  <span className="rf-display text-[30px] font-bold leading-[0.8]" style={{ color: accent }}>{String(idx + 1).padStart(2, '0')}</span>
                  <div className="pt-[3px]">
                    {step.title ? <p className="mb-[2px] text-[12.5px] font-bold tracking-tight">{step.title}</p> : null}
                    {step.instruction ? <p className="text-[11.5px] leading-[1.5] text-[#4a473f]">{step.instruction}</p> : null}
                    {step.tip ? <p className="mt-[4px] rounded-[8px] bg-[#f7f5f1] px-[9px] py-[5px] text-[10.5px] leading-[1.35] text-[#7a5010]"><span className="font-semibold" style={{ color: accent }}>Tip · </span>{step.tip}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-[11px] text-[#c4c0b8]">Los pasos de elaboración aparecerán aquí</p>}
        </section>
      </div>

      {/* FOOTER */}
      <div className="mx-[26px] mb-[14px] flex items-center justify-between border-t border-[#e4e1da] pt-[8px]">
        <span className="text-[9px] font-medium uppercase tracking-[0.12em] text-[#a09a8f]">{restaurantName(recipe)}</span>
        <span className="rf-mono text-[9px] font-medium" style={{ color: accent }}>{recipe.code || 'FT-000'} · {rev}</span>
        <span className="text-[9px] uppercase tracking-[0.08em] text-[#a09a8f]">{monthYear()}</span>
      </div>
    </div>
  )
}

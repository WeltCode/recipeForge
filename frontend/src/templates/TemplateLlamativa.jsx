import { groupIngredients, filterSteps, fmtQty, getPhoto, revLabel, stats, restaurantName, restaurantLogo, monthYear, AllergenSeal } from './shared'
import { Fork, Scale, Clock, Flame, Calendar } from '../components/icons'

const INK = '#141210'
const PRIMARY = '#FF5A1F'
const STAT_ICONS = { servings: Fork, yield: Scale, prep: Clock, cook: Flame, shelf: Calendar }

// PLANTILLA LLAMATIVA — póster de cocina: máximo contraste, tipografía condensada gigante.
export default function TemplateLlamativa({ recipe }) {
  const ingredients = groupIngredients(recipe.ingredients)
  const steps = filterSteps(recipe.steps)
  const photo = getPhoto(recipe)
  const logo = restaurantLogo(recipe)
  const rev = revLabel(recipe)
  const accent = recipe.accent_color || PRIMARY

  return (
    <div className="rf-a4 flex flex-col shadow-[0_20px_60px_rgba(0,0,0,0.18)]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif", background: '#fff' }}>
      {/* HERO */}
      <div className="relative overflow-hidden" style={{ height: 250, background: INK }}>
        {photo ? (
          <img src={photo} alt="" className="absolute inset-0 h-full w-full object-contain" style={{ filter: 'saturate(1.05) contrast(1.03)' }} />
        ) : (
          <div className="absolute inset-0" style={{ background: `radial-gradient(120% 120% at 100% 0%, ${accent}, ${INK} 60%)` }} />
        )}
        <div className="absolute inset-0" style={{ background: 'linear-gradient(0deg, rgba(0,0,0,.82) 8%, rgba(0,0,0,.15) 55%, rgba(0,0,0,.35) 100%)' }} />

        {/* barra superior */}
        <div className="absolute inset-x-0 top-0 flex items-center justify-between px-[24px] py-[14px]">
          {logo ? (
            <span className="inline-flex rounded-[6px] bg-white/95 px-[8px] py-[4px]"><img src={logo} alt="" className="h-[24px] w-auto object-contain" /></span>
          ) : <span className="text-[13px] font-bold uppercase tracking-[0.1em] text-white">{restaurantName(recipe)}</span>}
          <span className="rf-mono rounded-[4px] px-[8px] py-[3px] text-[11px] font-bold text-white" style={{ background: accent }}>{recipe.code || 'FT-000'}</span>
        </div>

        {/* título */}
        <div className="absolute inset-x-0 bottom-0 px-[24px] pb-[18px]">
          <span className="mb-[6px] inline-block rf-condensed text-[16px] tracking-[0.12em] text-white" style={{ background: accent, padding: '1px 10px' }}>
            {(recipe.category || 'Categoría').toUpperCase()}
          </span>
          <h1 className="rf-condensed text-[62px] leading-[0.86] text-white" style={{ textShadow: '0 2px 20px rgba(0,0,0,.4)' }}>{(recipe.name || 'Nombre del Plato').toUpperCase()}</h1>
        </div>
      </div>

      {/* STATS en bloques */}
      <div className="grid grid-cols-5" style={{ background: INK }}>
        {stats(recipe).map((s) => {
          const Icon = STAT_ICONS[s.key] || Fork
          return (
            <div key={s.key} className="flex flex-col items-center gap-[3px] border-r border-white/10 py-[11px] text-center last:border-r-0">
              <Icon size={16} style={{ color: accent }} />
              <span className="rf-condensed text-[22px] leading-[0.8] text-white">{s.value}</span>
              <span className="text-[7.5px] font-bold uppercase tracking-[0.14em] text-white/45">{s.label}</span>
            </div>
          )
        })}
      </div>

      {/* descripción */}
      {recipe.description?.trim() ? (
        <p className="px-[24px] py-[10px] text-[12px] font-medium leading-[1.4] text-[#3a352f]" style={{ borderBottom: `2px solid ${INK}` }}>{recipe.description}</p>
      ) : null}

      {/* BODY */}
      <div className="grid flex-1 overflow-hidden" style={{ gridTemplateColumns: '210px 1fr' }}>
        {/* Ingredientes: barra oscura */}
        <aside className="flex flex-col overflow-hidden px-[18px] py-[15px] text-white" style={{ background: INK }}>
          <p className="rf-condensed mb-[10px] text-[24px] leading-none" style={{ color: accent }}>INGREDIENTES</p>
          <div className="space-y-[10px]">
            {ingredients.length ? ingredients.map(([g, items]) => (
              <div key={g}>
                <p className="mb-[3px] text-[10px] font-bold uppercase tracking-[0.1em] text-white/45">{g}</p>
                {items.map((item, idx) => (
                  <div key={idx} className="flex items-baseline gap-[7px] border-b border-white/10 py-[3px] last:border-b-0">
                    <span className="rf-condensed shrink-0 text-[16px] leading-none" style={{ color: accent, minWidth: 46 }}>{fmtQty(item.quantity)} {item.unit || ''}</span>
                    <span className="text-[11.5px] font-medium leading-[1.25]">
                      {item.ingredient_name || 'Insumo'}
                      {item.note ? <span className="block text-[9px] text-white/40">{item.note}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            )) : <p className="text-[11px] text-white/40">Los ingredientes aparecerán aquí</p>}
          </div>
          {recipe.observations?.trim() ? (
            <div className="mt-auto pt-[10px]">
              <p className="rf-condensed text-[15px]" style={{ color: accent }}>OJO</p>
              <p className="text-[10px] leading-[1.4] text-white/70">{recipe.observations}</p>
            </div>
          ) : null}
          <AllergenSeal recipe={recipe} accent={accent} />
        </aside>

        {/* Proceso: números gigantes */}
        <section className="overflow-hidden px-[22px] py-[15px]">
          <p className="rf-condensed mb-[12px] text-[24px] leading-none text-[#141210]">ELABORACIÓN</p>
          {steps.length ? (
            <div className="space-y-[13px]">
              {steps.map((step, idx) => (
                <div key={idx} className="grid gap-[13px]" style={{ gridTemplateColumns: '44px 1fr' }}>
                  <div className="flex h-[42px] w-[42px] items-center justify-center rounded-[10px]" style={{ background: accent }}>
                    <span className="rf-condensed text-[28px] leading-none text-white">{idx + 1}</span>
                  </div>
                  <div className="pt-[2px]">
                    {step.title ? <p className="text-[13px] font-extrabold uppercase tracking-[0.02em] text-[#141210]">{step.title}</p> : null}
                    {step.instruction ? <p className="text-[12px] font-medium leading-[1.45] text-[#3a352f]">{step.instruction}</p> : null}
                    {step.tip ? <p className="mt-[3px] inline-block text-[10.5px] font-semibold" style={{ background: '#ffe9df', color: '#c2410c', padding: '2px 7px', borderRadius: 5 }}>▸ {step.tip}</p> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="text-[11px] text-[#b0aaa2]">Los pasos aparecerán aquí</p>}
        </section>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between px-[24px] py-[7px] text-white" style={{ background: accent }}>
        <span className="rf-condensed text-[15px] tracking-[0.06em]">{restaurantName(recipe).toUpperCase()}</span>
        <span className="text-[9px] font-bold uppercase tracking-[0.1em]">{recipe.code || 'FT-000'} · {rev} · {monthYear()}</span>
      </div>
    </div>
  )
}

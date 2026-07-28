import { groupIngredients, filterSteps, fmtQty, getPhoto, revLabel, stats, restaurantName, restaurantLogo, monthYear } from './shared'

// PLANTILLA FORMAL — ficha técnica sobria en blanco y negro, máxima legibilidad.
export default function TemplateFormal({ recipe }) {
  const ingredients = groupIngredients(recipe.ingredients)
  const steps = filterSteps(recipe.steps)
  const photo = getPhoto(recipe)
  const logo = restaurantLogo(recipe)
  const rev = revLabel(recipe)

  return (
    <div className="rf-a4 flex flex-col border border-[#cccccc] shadow-[0_20px_60px_rgba(0,0,0,0.18)]" style={{ fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      {/* HEADER */}
      <div className="flex items-center justify-between border-b-[2.5px] border-[#1a1a18] bg-white px-[18px] py-[10px]">
        {logo ? (
          <img src={logo} alt="" className="h-[36px] w-auto object-contain" />
        ) : (
          <span className="text-[15px] font-bold uppercase tracking-[0.08em] text-[#1a1a18]">{restaurantName(recipe)}</span>
        )}
        <div className="text-right">
          <p className="rf-mono text-[10px] uppercase tracking-[0.16em] text-[#888888]">Ficha Técnica de Producción</p>
          <p className="rf-mono mt-[2px] text-[13px] font-medium text-[#1a1a18]">{recipe.code || 'FT-000'} / {rev}</p>
        </div>
      </div>

      {/* HERO */}
      <div className="grid border-b-[2.5px] border-[#1a1a18]" style={{ gridTemplateColumns: '185px 1fr' }}>
        <div className="flex items-center justify-center border-r-[2.5px] border-[#1a1a18] bg-[#f5f2ed]" style={{ width: 185, height: 155 }}>
          {photo ? (
            <img src={photo} alt="" className="block h-full w-full object-contain" />
          ) : (
            <span className="rf-mono text-center text-[11px] uppercase leading-relaxed tracking-[0.1em] text-[#aaaaaa]">Sin foto</span>
          )}
        </div>
        <div className="flex flex-col justify-center bg-white px-[18px] py-[12px]">
          <p className="rf-mono mb-[6px] text-[10px] uppercase tracking-[0.16em] text-[#999999]">{recipe.category || 'Categoría'}</p>
          <h1 className="mb-[8px] text-[28px] font-bold leading-[1.05] tracking-tight text-[#1a1a18]">{recipe.name || 'Nombre del Plato'}</h1>
          <p className="border-t border-[#e0e0e0] pt-[6px] text-[12px] leading-[1.45] text-[#555555]">{recipe.description || 'Descripción del plato aparecerá aquí.'}</p>
        </div>
      </div>

      {/* STATS */}
      <div className="flex border-b-[2.5px] border-[#1a1a18] bg-[#f5f5f5]">
        {stats(recipe).map((s, i, arr) => (
          <div key={s.key} className={`flex flex-1 flex-col items-center gap-[2px] py-[8px] text-center ${i < arr.length - 1 ? 'border-r border-[#dddddd]' : ''}`}>
            <span className="text-[16px] font-bold leading-none text-[#1a1a18]">{s.value}</span>
            <span className="rf-mono text-[9px] uppercase tracking-[0.06em] text-[#888888]">{s.label}</span>
          </div>
        ))}
      </div>

      {/* BODY */}
      <div className="grid flex-1 border-b-[2.5px] border-[#1a1a18]" style={{ gridTemplateColumns: '185px 1fr' }}>
        <aside className="flex flex-col overflow-hidden border-r-[2.5px] border-[#1a1a18] bg-white px-[10px] py-[9px]">
          <div className="rf-mono mb-[8px] flex items-center gap-[4px] text-[9.5px] font-medium uppercase tracking-[0.1em] text-[#1a1a18]">
            Ingredientes<span className="h-[0.5px] flex-1 bg-[#cccccc]" />
          </div>
          <div className="space-y-[9px]">
            {ingredients.length ? ingredients.map(([g, items]) => (
              <div key={g}>
                <p className="mb-[3px] border-l-[2px] border-[#1a1a18] pl-[5px] text-[10px] font-bold uppercase tracking-[0.04em] text-[#1a1a18]">{g}</p>
                {items.map((item, idx) => (
                  <div key={idx} className="grid border-b border-[#eeeeee] py-[3px] last:border-b-0" style={{ gridTemplateColumns: '48px 1fr' }}>
                    <span className="rf-mono border-r border-[#cccccc] pr-[5px] text-right text-[11px] font-medium text-[#1a1a18]">{fmtQty(item.quantity)} {item.unit || ''}</span>
                    <span className="pl-[6px] text-[11px] leading-[1.25] text-[#1a1a18]">
                      {item.ingredient_name || 'Insumo'}
                      {item.note ? <span className="block text-[9.5px] text-[#888888]">{item.note}</span> : null}
                    </span>
                  </div>
                ))}
              </div>
            )) : <p className="rf-mono text-[11px] text-[#bbbbbb]">Los ingredientes aparecerán aquí</p>}
          </div>
          {recipe.observations?.trim() ? (
            <div className="mt-auto pt-[8px]">
              <div className="border-t-[1.5px] border-[#1a1a18] pt-[6px]">
                <p className="rf-mono mb-[3px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#1a1a18]">Observaciones</p>
                <p className="text-[10px] leading-[1.4] text-[#333333]">{recipe.observations}</p>
              </div>
            </div>
          ) : null}
        </aside>

        <section className="overflow-hidden bg-[#fafafa] px-[12px] py-[9px]">
          <div className="rf-mono mb-[8px] flex items-center gap-[4px] text-[9.5px] font-medium uppercase tracking-[0.1em] text-[#1a1a18]">
            Proceso paso a paso<span className="h-[0.5px] flex-1 bg-[#cccccc]" />
          </div>
          {steps.length ? (
            <div className="flex flex-col">
              {steps.map((step, idx) => (
                <div key={idx} className="relative grid" style={{ gridTemplateColumns: '29px 1fr' }}>
                  {idx < steps.length - 1 && <div className="absolute bg-[#dddddd]" style={{ left: 14, top: 29, bottom: -2, width: 1.5 }} />}
                  <div className="relative z-10 flex flex-col items-center pt-[1px]">
                    <div className="rf-mono flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#1a1a18] text-[11px] font-medium text-[#c8870a]">{idx + 1}</div>
                  </div>
                  <div className="pb-[9px] pl-[8px] pt-[1px]">
                    {step.title ? <p className="mb-[2px] text-[11.5px] font-bold uppercase tracking-[0.03em] text-[#1a1a18]">{step.title}</p> : null}
                    {step.instruction ? <p className="text-[11.5px] leading-[1.45] text-[#333333]">{step.instruction}</p> : null}
                    {step.tip ? <span className="mt-[3px] block border-l-[2px] border-[#c8870a] bg-[#fdf6e8] px-[6px] py-[3px] text-[10.5px] leading-[1.35] text-[#7a5010]">{step.tip}</span> : null}
                  </div>
                </div>
              ))}
            </div>
          ) : <p className="rf-mono text-[11px] text-[#bbbbbb]">Los pasos de elaboración aparecerán aquí</p>}
        </section>
      </div>

      {/* FOOTER */}
      <div className="flex items-center justify-between border-t-[2.5px] border-[#1a1a18] bg-[#f5f5f5] px-[14px] py-[5px]">
        <span className="rf-mono text-[9px] uppercase tracking-[0.05em] text-[#888888]">{restaurantName(recipe)} · Producción</span>
        <span className="rf-mono text-[9px] font-medium tracking-[0.07em] text-[#1a1a18]">{recipe.code || 'FT-000'} · {rev}</span>
        <span className="rf-mono text-[9px] uppercase tracking-[0.05em] text-[#888888]">1 / 1 · {monthYear()}</span>
      </div>
    </div>
  )
}

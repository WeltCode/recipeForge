import ldtLogo from '../assets/ldt.png'

function groupIngredients(ingredients) {
  const grouped = new Map()

  for (const ingredient of ingredients) {
    const groupName = ingredient.group_name?.trim() || 'Ingredientes'
    const current = grouped.get(groupName) ?? []
    current.push(ingredient)
    grouped.set(groupName, current)
  }

  return Array.from(grouped.entries())
}

function RecipeSheetPreview({ recipe }) {
  const ingredients = groupIngredients(recipe.ingredients ?? [])
  const steps = (recipe.steps ?? []).filter(
    (step) => step.title?.trim() || step.instruction?.trim() || step.tip?.trim(),
  )

  return (
    <section className="overflow-hidden rounded-[28px] border border-stone-300 bg-[#f6efe4] shadow-[0_18px_60px_rgba(0,0,0,0.12)]">
      <div className="grid min-h-[min(100vh,1180px)] grid-rows-[auto_auto_auto_1fr_auto] bg-[#f6efe4]">

        {/* Barra de logo superior */}
        <div className="flex items-center justify-between border-b border-stone-200 bg-[#f0ebe0] px-5 py-3">
          <img src={ldtLogo} alt="Leche de Tigre" className="h-10 object-contain" />
          <div className="text-right">
            <p className="text-[8px] font-semibold uppercase tracking-[0.3em] text-stone-400">Ficha Tecnica de Produccion</p>
            <p className="text-[11px] font-bold text-stone-800">{recipe.code || 'FT-000'} / REV.01</p>
          </div>
        </div>

        <header className="grid gap-0 bg-[#161412] md:grid-cols-[240px_1fr]">
          <div className="relative min-h-52 overflow-hidden bg-stone-800">
            {recipe.photoPreviewUrl ? (
              <img
                src={recipe.photoPreviewUrl}
                alt="Foto del plato"
                className="absolute inset-0 h-full w-full object-cover"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-[11px] font-semibold uppercase tracking-[0.25em] text-stone-500">
                Foto del plato
              </div>
            )}
          </div>

          <div className="flex flex-col justify-between gap-5 px-5 py-5 text-white md:px-6 md:py-6">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.35em] text-amber-400">
                Plato principal - Cocina tradicional
              </p>
              <h2 className="mt-2 max-w-xl text-4xl font-semibold leading-[0.88] tracking-tighter text-white md:text-5xl">
                {recipe.name || 'Nombre de la receta'}
              </h2>
              <p className="mt-4 max-w-2xl border-t border-white/10 pt-4 text-sm leading-6 text-white/70 md:text-[15px]">
                {recipe.description || 'Descripcion breve de la receta y de su tecnica principal.'}
              </p>
            </div>

            <div className="flex flex-wrap gap-3 text-[10px] uppercase tracking-[0.28em] text-white/45">
              <span className="rounded-full border border-white/10 px-3 py-1">Codigo {recipe.code || 'FT-000'}</span>
            </div>
          </div>
        </header>

        <div className="grid grid-cols-2 border-y border-stone-900/15 bg-[#efe6d8] text-stone-900 md:grid-cols-5">
          {[
            [recipe.servings || '1', 'Porciones'],
            [recipe.yield_grams ? `${recipe.yield_grams} g` : '---', 'Gramaje'],
            [recipe.prep_time_min ? `${recipe.prep_time_min} min` : '0 min', 'Preparacion'],
            [recipe.cook_time_min ? `${recipe.cook_time_min} min` : '0 min', 'Coccion'],
            [recipe.service_temp_c ? `${recipe.service_temp_c} C` : '---', 'Tiempo de vida'],
          ].map(([value, label]) => (
            <div key={label} className="border-r border-stone-900/10 px-4 py-3 text-center last:border-r-0">
              <div className="text-lg font-semibold">{value}</div>
              <div className="mt-1 text-[10px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                {label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid flex-1 gap-0 md:grid-cols-[240px_1fr]">
          <aside className="border-r border-stone-900/15 bg-white px-4 py-4 md:px-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-700">
              <span className="h-px flex-1 bg-stone-300" /> Ingredientes <span className="h-px flex-1 bg-stone-300" />
            </div>

            <div className="space-y-4">
              {ingredients.map(([groupName, items]) => (
                <div key={groupName} className="space-y-2">
                  <h3 className="border-l-4 border-red-600 pl-2 text-[11px] font-bold uppercase tracking-[0.18em] text-red-700">
                    {groupName}
                  </h3>
                  <div className="space-y-2">
                    {items.map((item, index) => (
                      <div key={`${groupName}-${index}`} className="grid grid-cols-[62px_1fr] gap-2 border-b border-stone-200 pb-2 last:border-b-0">
                        <div className="pt-px text-right font-mono text-[12px] font-semibold text-stone-900">
                          {item.quantity || 0} {item.unit || ''}
                        </div>
                        <div className="text-[13px] leading-5 text-stone-700">
                          <div className="font-medium text-stone-900">{item.ingredient_name || 'Insumo'}</div>
                          {item.note ? <div className="italic text-stone-500">{item.note}</div> : null}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="rounded-xl border border-red-200 bg-red-50 p-3">
                <div className="mb-2 text-[10px] font-semibold uppercase tracking-[0.28em] text-red-700">
                  Alertas
                </div>
                <div className="flex flex-wrap gap-2 text-[10px] font-semibold uppercase tracking-[0.16em] text-white">
                  <span className="rounded bg-red-700 px-2 py-1">Gluten</span>
                  <span className="rounded bg-red-700 px-2 py-1">Lacteos</span>
                </div>
              </div>
            </div>
          </aside>

          <section className="bg-[#f7f2ea] px-4 py-4 md:px-5">
            <div className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.35em] text-amber-700">
              <span className="h-px flex-1 bg-stone-300" /> Proceso paso a paso <span className="h-px flex-1 bg-stone-300" />
            </div>

            <div className="space-y-4">
              {steps.length ? (
                steps.map((step, index) => (
                  <div key={`${step.title}-${index}`} className="grid grid-cols-[34px_1fr] gap-0">
                    <div className="relative flex justify-center">
                      <div className="z-10 flex h-7 w-7 items-center justify-center rounded-full bg-stone-900 text-[12px] font-semibold text-amber-400">
                        {index + 1}
                      </div>
                      {index !== steps.length - 1 ? (
                        <div className="absolute left-1/2 top-7 h-full w-0.5 -translate-x-1/2 bg-stone-300" />
                      ) : null}
                    </div>

                    <div className="pb-4 pl-3">
                      <h4 className="text-[13px] font-bold uppercase tracking-[0.06em] text-stone-900">
                        {step.title || `Paso ${index + 1}`}
                      </h4>
                      <p className="mt-1 text-[12.5px] leading-6 text-stone-700">
                        {step.instruction || 'Descripcion del paso de produccion.'}
                      </p>
                      {step.tip ? (
                        <div className="mt-2 border-l-4 border-amber-400 bg-amber-50 px-3 py-2 text-[12px] italic leading-6 text-amber-900">
                          {step.tip}
                        </div>
                      ) : null}
                    </div>
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-stone-300 bg-white/60 p-5 text-sm text-stone-500">
                  Agrega pasos para ver la secuencia de produccion en la ficha.
                </div>
              )}
            </div>
          </section>
        </div>

        <footer className="flex items-center justify-between border-t border-stone-900/15 bg-[#efe6d8] px-4 py-3 text-[10px] uppercase tracking-[0.3em] text-stone-500 md:px-5">
          <span>RecipeForge - Ficha tecnica</span>
          <span>{recipe.code || 'FT-000'}</span>
          <span>1 / 1</span>
        </footer>
      </div>
    </section>
  )
}

export default RecipeSheetPreview
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
    (s) => s.title?.trim() || s.instruction?.trim() || s.tip?.trim(),
  )

  const shelfLife =
    recipe.shelf_life_value
      ? `${recipe.shelf_life_value} ${recipe.shelf_life_unit === 'meses' ? 'meses' : 'días'}`
      : '—'

  return (
    <div className="a4-sheet bg-white border border-[#cccccc] shadow-[0_20px_60px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden">
      <style>{`
        .a4-sheet {
          width: 210mm;
          height: 297mm;
          box-sizing: border-box;
          overflow: hidden;
          font-family: 'DM Sans', system-ui, sans-serif;
        }
        @media print {
          .a4-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
            width: 210mm !important;
            height: 297mm !important;
            overflow: hidden !important;
          }
        }
        .rf-mono { font-family: 'DM Mono', 'Courier New', monospace; }
      `}</style>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between border-b-[2.5px] border-[#1a1a18] bg-white px-[18px] py-[10px]">
        <img src={ldtLogo} alt="Leche de Tigre" className="h-[34px] w-auto object-contain" />
        <div className="text-right">
          <p className="rf-mono text-[7.5px] uppercase tracking-[0.2em] text-[#888888]">
            Ficha Técnica de Producción
          </p>
          <p className="rf-mono mt-[2px] text-[11px] font-medium text-[#1a1a18]">
            {recipe.code || 'FT-000'} / REV.01
          </p>
        </div>
      </div>

      {/* ── HERO: foto + título ── */}
      <div className="grid border-b-[2.5px] border-[#1a1a18]" style={{ gridTemplateColumns: '160px 1fr' }}>
        {/* Foto */}
        <div className="border-r-[2.5px] border-[#1a1a18]" style={{ width: 160, height: 120 }}>
          {recipe.photoPreviewUrl ? (
            <img
              src={recipe.photoPreviewUrl}
              alt="Foto del plato"
              className="h-full w-full object-cover block"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#f0ece6]">
              <span className="rf-mono text-center text-[9px] uppercase tracking-[0.15em] text-[#aaaaaa] leading-relaxed">
                📷<br />Sin foto
              </span>
            </div>
          )}
        </div>

        {/* Texto hero */}
        <div className="flex flex-col justify-center bg-white px-[16px] py-[10px]">
          <p className="rf-mono text-[7.5px] uppercase tracking-[0.2em] text-[#999999] mb-[5px]">
            {recipe.category || 'Categoría'}
          </p>
          <h1 className="text-[22px] font-bold leading-[1.05] tracking-tight text-[#1a1a18] mb-[6px]">
            {recipe.name || 'Nombre del Plato'}
          </h1>
          <p className="border-t border-[#e0e0e0] pt-[5px] text-[9.5px] leading-[1.35] text-[#666666]">
            {recipe.description || 'Descripción del plato aparecerá aquí.'}
          </p>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="flex border-b-[2.5px] border-[#1a1a18] bg-[#f5f5f5]">
        {[
          [recipe.servings || '—', 'Raciones'],
          [recipe.yield_grams ? `${recipe.yield_grams} g` : '—', 'Gramaje / ración'],
          [recipe.prep_time_min ? `${recipe.prep_time_min} min` : '—', 'Preparación'],
          [recipe.cook_time_min ? `${recipe.cook_time_min} min` : '—', 'Cocción'],
          [shelfLife, 'Vida útil'],
        ].map(([value, label], i, arr) => (
          <div
            key={label}
            className={`flex flex-1 flex-col items-center gap-[1px] py-[7px] px-0 text-center ${i < arr.length - 1 ? 'border-r border-[#dddddd]' : ''}`}
          >
            <span className="text-[13px] font-bold leading-none text-[#1a1a18]">
              {value}
            </span>
            <span className="rf-mono text-[7px] uppercase tracking-[0.08em] text-[#888888]">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── BODY: ingredientes + pasos ── */}
      <div className="grid flex-1 border-b-[2.5px] border-[#1a1a18]" style={{ gridTemplateColumns: '160px 1fr' }}>

        {/* ── COLUMNA IZQUIERDA: Ingredientes ── */}
        <aside className="border-r-[2.5px] border-[#1a1a18] bg-white px-[9px] py-[9px] overflow-hidden">

          {/* Título col */}
          <div className="rf-mono mb-[8px] flex items-center gap-[4px] text-[7.5px] font-medium uppercase tracking-[0.15em] text-[#1a1a18]">
            Ingredientes
            <span className="h-[0.5px] flex-1 bg-[#cccccc]" />
          </div>

          {/* Grupos de ingredientes */}
          <div className="space-y-[9px]">
            {ingredients.length ? (
              ingredients.map(([groupName, items]) => (
                <div key={groupName}>
                  <p className="mb-[3px] border-l-[2px] border-[#1a1a18] pl-[5px] text-[8px] font-bold uppercase tracking-[0.06em] text-[#1a1a18]">
                    {groupName}
                  </p>
                  <div>
                    {items.map((item, idx) => (
                      <div
                        key={`${groupName}-${idx}`}
                        className="grid border-b border-[#eeeeee] py-[2px] last:border-b-0"
                        style={{ gridTemplateColumns: '42px 1fr' }}
                      >
                        <span className="rf-mono border-r border-[#cccccc] pr-[5px] text-right text-[9px] font-medium text-[#1a1a18]">
                          {item.quantity || 'c/s'} {item.unit || ''}
                        </span>
                        <span className="pl-[5px] text-[9px] leading-[1.2] text-[#222222]">
                          {item.ingredient_name || 'Insumo'}
                          {item.note ? (
                            <span className="block text-[8px] text-[#888888]">
                              {item.note}
                            </span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="rf-mono text-[9px] text-[#bbbbbb]">
                Los ingredientes aparecerán aquí
              </p>
            )}
          </div>
        </aside>

        {/* ── COLUMNA DERECHA: Pasos ── */}
        <section className="bg-[#fafafa] px-[11px] py-[9px] overflow-hidden">

          {/* Título col */}
          <div className="rf-mono mb-[8px] flex items-center gap-[4px] text-[7.5px] font-medium uppercase tracking-[0.15em] text-[#1a1a18]">
            Proceso paso a paso
            <span className="h-[0.5px] flex-1 bg-[#cccccc]" />
          </div>

          {/* Lista de pasos */}
          {steps.length ? (
            <div className="flex flex-col">
              {steps.map((step, idx) => (
                <div
                  key={`step-${idx}`}
                  className="relative grid"
                  style={{ gridTemplateColumns: '26px 1fr' }}
                >
                  {/* Línea conectora */}
                  {idx < steps.length - 1 && (
                    <div
                      className="absolute bg-[#dddddd]"
                      style={{ left: 12, top: 26, bottom: -2, width: 1.5 }}
                    />
                  )}

                  {/* Número del paso */}
                  <div className="relative z-10 flex flex-col items-center pt-[1px]">
                    <div className="rf-mono flex h-[23px] w-[23px] items-center justify-center rounded-full bg-[#1a1a18] text-[9.5px] font-medium text-[#c8870a]">
                      {idx + 1}
                    </div>
                  </div>

                  {/* Contenido del paso */}
                  <div className="pb-[7px] pl-[7px] pt-[1px]">
                    {step.title ? (
                      <p className="mb-[2px] text-[9.5px] font-bold uppercase tracking-[0.04em] text-[#1a1a18]">
                        {step.title}
                      </p>
                    ) : null}
                    {step.instruction ? (
                      <p className="text-[9.5px] leading-[1.4] text-[#333333]">
                        {step.instruction}
                      </p>
                    ) : null}
                    {step.tip ? (
                      <span className="mt-[3px] block border-l-[2px] border-[#c8870a] bg-[#fdf6e8] px-[6px] py-[2px] text-[8.5px] leading-[1.3] text-[#7a5010]">
                        {step.tip}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rf-mono text-[9px] text-[#bbbbbb]">
              Los pasos de elaboración aparecerán aquí
            </p>
          )}
        </section>
      </div>

      {/* ── FOOTER ── */}
      <div className="flex items-center justify-between border-t-[2.5px] border-[#1a1a18] bg-[#f5f5f5] px-[14px] py-[5px]">
        <span className="rf-mono text-[7px] uppercase tracking-[0.06em] text-[#888888]">
          Leche de Tigre · Cocina · Producción
        </span>
        <span className="rf-mono text-[7px] font-medium tracking-[0.08em] text-[#1a1a18]">
          {recipe.code || 'FT-000'}
        </span>
        <span className="rf-mono text-[7px] uppercase tracking-[0.06em] text-[#888888]">
          1 / 1 · {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </span>
      </div>
    </div>
  )
}

export default RecipeSheetPreview

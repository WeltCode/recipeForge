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

/**
 * RecipeSheetPreview
 *
 * Replica exacta de la ficha técnica A4 imprimible.
 * Diseño: fondo blanco, bordes negros, tipografía marcada.
 * Sin fondos oscuros — apta para impresión directa.
 *
 * Props: recipe (objeto con todos los campos del form de App.jsx)
 *
 * Para imprimir: envolver en un botón con window.print()
 * y añadir en index.css:
 *   @media print {
 *     .no-print { display: none !important; }
 *     @page { size: A4; margin: 0; }
 *   }
 */
function RecipeSheetPreview({ recipe }) {
  const ingredients = groupIngredients(recipe.ingredients ?? [])
  const steps = (recipe.steps ?? []).filter(
    (s) => s.title?.trim() || s.instruction?.trim() || s.tip?.trim(),
  )

  const shelfLife = recipe.service_temp_c
    ? `${recipe.service_temp_c} días`
    : '—'

  return (
    /*
     * .a4-sheet  →  width: 210mm, min-height: 297mm
     * Definido abajo con un <style> tag inline para no requerir
     * config extra en Tailwind. Todo lo demás usa clases Tailwind v4.
     */
    <div className="a4-sheet bg-white border border-[#cccccc] shadow-[0_20px_60px_rgba(0,0,0,0.18)] flex flex-col overflow-hidden font-sans">
      <style>{`
        .a4-sheet {
          width: 210mm;
          min-height: 297mm;
        }
        @media print {
          .a4-sheet {
            box-shadow: none !important;
            border: none !important;
            margin: 0 !important;
          }
          @page { size: A4; margin: 0; }
        }
        @import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400;600;700&family=DM+Mono:wght@400;500&display=swap');
        .font-serif-display { font-family: 'DM Serif Display', serif; }
        .font-mono-dm       { font-family: 'DM Mono', monospace; }
        .font-sans-dm       { font-family: 'DM Sans', sans-serif; }
      `}</style>

      {/* ── HEADER ── */}
      <div className="flex items-center justify-between border-b-[2.5px] border-[#1a1a18] bg-white px-[26px] py-[18px]">
        <img
          src={ldtLogo}
          alt="Leche de Tigre"
          className="h-[46px] w-auto object-contain"
        />
        <div className="text-right">
          <p className="font-mono-dm text-[8px] uppercase tracking-[0.25em] text-[#666666]">
            Ficha Técnica de Producción
          </p>
          <p className="font-mono-dm mt-[2px] text-[13px] font-medium text-[#1a1a18]">
            {recipe.code || 'FT-000'} / REV.01
          </p>
        </div>
      </div>

      {/* ── HERO: foto + título ── */}
      <div className="grid border-b-[2.5px] border-[#1a1a18]" style={{ gridTemplateColumns: '220px 1fr' }}>
        {/* Foto */}
        <div className="border-r-[2.5px] border-[#1a1a18]" style={{ width: 220, height: 185 }}>
          {recipe.photoPreviewUrl ? (
            <img
              src={recipe.photoPreviewUrl}
              alt="Foto del plato"
              className="h-full w-full object-cover block"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-[#f0f0f0]">
              <span className="font-mono-dm text-center text-[8px] uppercase tracking-[0.2em] text-[#aaaaaa] leading-relaxed">
                📷<br />Foto del<br />plato
              </span>
            </div>
          )}
        </div>

        {/* Texto hero */}
        <div className="flex flex-col justify-center bg-white px-5 py-4">
          <p className="font-mono-dm text-[8px] uppercase tracking-[0.25em] text-[#888888] mb-[7px]">
            {recipe.category || 'Plato Principal · Cocina'}
          </p>
          <h1 className="font-serif-display text-[34px] leading-[0.95] tracking-tight text-[#1a1a18] mb-[10px]">
            {recipe.name || 'Nombre del Plato'}
          </h1>
          <p className="font-serif-display border-t border-[#dddddd] pt-[9px] text-[12px] italic leading-[1.45] text-[#555555]">
            {recipe.description || 'Descripción del plato aparecerá aquí.'}
          </p>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="flex border-b-[2.5px] border-[#1a1a18] bg-[#f7f7f7]">
        {[
          [recipe.servings || '—', 'Raciones'],
          [recipe.yield_grams ? `${recipe.yield_grams} g` : '—', 'Gramaje / ración'],
          [recipe.prep_time_min ? `${recipe.prep_time_min} min` : '—', 'Preparación'],
          [recipe.cook_time_min ? `${recipe.cook_time_min} min` : '—', 'Cocción'],
          [shelfLife, 'Tiempo de vida'],
        ].map(([value, label], i, arr) => (
          <div
            key={label}
            className={`flex flex-1 flex-col items-center gap-[2px] py-[9px] px-[6px] text-center ${i < arr.length - 1 ? 'border-r border-[#cccccc]' : ''}`}
          >
            <span className="font-sans-dm text-[15px] font-bold leading-none text-[#1a1a18]">
              {value}
            </span>
            <span className="font-mono-dm text-[7px] uppercase tracking-[0.1em] text-[#777777]">
              {label}
            </span>
          </div>
        ))}
      </div>

      {/* ── BODY: ingredientes + pasos ── */}
      <div className="grid flex-1 border-b-[2.5px] border-[#1a1a18]" style={{ gridTemplateColumns: '195px 1fr' }}>

        {/* ── COLUMNA IZQUIERDA: Ingredientes ── */}
        <aside className="border-r-[2.5px] border-[#1a1a18] bg-white px-3 py-[14px]">

          {/* Título col */}
          <div className="font-mono-dm mb-[11px] flex items-center gap-[6px] text-[8px] font-medium uppercase tracking-[0.3em] text-[#1a1a18]">
            Ingredientes
            <span className="h-[1.5px] flex-1 bg-[#1a1a18]" />
          </div>

          {/* Grupos de ingredientes */}
          <div className="space-y-[12px]">
            {ingredients.length ? (
              ingredients.map(([groupName, items]) => (
                <div key={groupName}>
                  {/* Nombre del grupo */}
                  <p className="font-sans-dm mb-[6px] border-l-[3px] border-[#1a1a18] pl-[7px] text-[8.5px] font-bold uppercase tracking-[0.15em] text-[#1a1a18]">
                    {groupName}
                  </p>
                  {/* Filas de ingredientes */}
                  <div>
                    {items.map((item, idx) => (
                      <div
                        key={`${groupName}-${idx}`}
                        className="grid border-b border-[#e8e8e8] py-[4px] last:border-b-0"
                        style={{ gridTemplateColumns: '50px 1fr' }}
                      >
                        <span className="font-mono-dm border-r-[1.5px] border-[#aaaaaa] pr-[7px] text-right text-[10px] font-medium text-[#1a1a18]">
                          {item.quantity || 'c/s'} {item.unit || ''}
                        </span>
                        <span className="font-sans-dm pl-[7px] text-[10.5px] leading-[1.3] text-[#1a1a18]">
                          {item.ingredient_name || 'Insumo'}
                          {item.note ? (
                            <span className="block text-[9px] italic text-[#777777]">
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
              <p className="font-mono-dm text-[9px] italic text-[#aaaaaa]">
                Los ingredientes aparecerán aquí
              </p>
            )}
          </div>

          {/* Alérgenos — solo si hay datos */}
          {recipe.allergens?.length ? (
            <div className="mt-[12px] rounded-[2px] border-[1.5px] border-[#1a1a18] bg-[#f0f0f0] p-[7px]">
              <p className="font-mono-dm mb-[6px] text-[7.5px] font-medium uppercase tracking-[0.2em] text-[#1a1a18]">
                ⚠ Alérgenos
              </p>
              <div className="flex flex-wrap gap-[4px]">
                {recipe.allergens.map((a) => (
                  <span
                    key={a}
                    className="font-mono-dm rounded-[2px] bg-[#1a1a18] px-[6px] py-[2px] text-[8px] font-medium text-white"
                  >
                    {a}
                  </span>
                ))}
              </div>
            </div>
          ) : null}
        </aside>

        {/* ── COLUMNA DERECHA: Pasos ── */}
        <section className="bg-[#fafafa] px-4 py-[14px]">

          {/* Título col */}
          <div className="font-mono-dm mb-[11px] flex items-center gap-[6px] text-[8px] font-medium uppercase tracking-[0.3em] text-[#1a1a18]">
            Proceso paso a paso
            <span className="h-[1.5px] flex-1 bg-[#1a1a18]" />
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
                  {/* Línea conectora entre pasos */}
                  {idx < steps.length - 1 && (
                    <div
                      className="absolute bg-[#cccccc]"
                      style={{ left: 12, top: 24, bottom: 0, width: 1.5 }}
                    />
                  )}

                  {/* Número del paso */}
                  <div className="relative z-10 flex flex-col items-center pt-[2px]">
                    <div className="font-mono-dm flex h-6 w-6 items-center justify-center rounded-full bg-[#1a1a18] text-[10px] font-medium text-white">
                      {idx + 1}
                    </div>
                  </div>

                  {/* Contenido del paso */}
                  <div className="pb-[13px] pl-[9px] pt-[2px]">
                    {step.title ? (
                      <p className="font-sans-dm mb-[3px] text-[11px] font-bold uppercase tracking-[0.03em] text-[#1a1a18]">
                        {step.title}
                      </p>
                    ) : null}
                    {step.instruction ? (
                      <p className="font-sans-dm text-[10.5px] leading-[1.55] text-[#333333]">
                        {step.instruction}
                      </p>
                    ) : null}
                    {step.tip ? (
                      <span className="font-sans-dm mt-[4px] block border-l-[3px] border-[#1a1a18] bg-[#efefef] px-[7px] py-[3px] text-[9.5px] italic leading-[1.4] text-[#444444]">
                        💡 {step.tip}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="font-mono-dm text-[9px] italic text-[#aaaaaa]">
              Los pasos de elaboración aparecerán aquí
            </p>
          )}
        </section>
      </div>

      {/* ── FOOTER ── */}
      <div className="flex items-center justify-between border-t-[2.5px] border-[#1a1a18] bg-[#f7f7f7] px-[26px] py-[8px]">
        <span className="font-mono-dm text-[7.5px] uppercase tracking-[0.1em] text-[#666666]">
          Leche de Tigre · Cocina · Producción
        </span>
        <span className="font-mono-dm text-[9px] font-medium tracking-[0.2em] text-[#1a1a18]">
          {recipe.code || 'FT-000'}
        </span>
        <span className="font-mono-dm text-[7.5px] uppercase tracking-[0.1em] text-[#666666]">
          1 / 1 · {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </span>
      </div>
    </div>
  )
}

export default RecipeSheetPreview
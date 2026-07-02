import ldtLogo from '../assets/LDTlogo.png'
import { fmtDecimal, parseDecimal } from '../lib/ui'

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

// Muestra la cantidad con decimales (coma), sin ceros sobrantes.
function fmtQty(val) {
  if (val === '' || val == null) return 'c/s'
  const s = fmtDecimal(val)
  return s === '' ? 'c/s' : s
}

function RecipeSheetPreview({ recipe }) {
  const ingredients = groupIngredients(recipe.ingredients ?? [])
  const steps = (recipe.steps ?? []).filter(
    (s) => s.title?.trim() || s.instruction?.trim() || s.tip?.trim(),
  )

  const shelfLife = recipe.shelf_life_value
    ? `${recipe.shelf_life_value} ${recipe.shelf_life_unit === 'meses' ? 'meses' : 'días'}`
    : '—'

  const yieldDisplay = recipe.yield_quantity
    ? `${fmtQty(recipe.yield_quantity)} ${recipe.yield_unit || 'g'}`
    : '—'

  const revLabel = `Rev. 0.${recipe.revision || 1}`

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
        <img src={ldtLogo} alt="Leche de Tigre" className="h-[36px] w-auto object-contain" />
        <div className="text-right">
          <p className="rf-mono text-[10px] uppercase tracking-[0.16em] text-[#888888]">
            Ficha Técnica de Producción
          </p>
          <p className="rf-mono mt-[2px] text-[13px] font-medium text-[#1a1a18]">
            {recipe.code || 'FT-000'} / {revLabel}
          </p>
        </div>
      </div>

      {/* ── HERO: foto + título ── */}
      <div className="grid border-b-[2.5px] border-[#1a1a18]" style={{ gridTemplateColumns: '185px 1fr' }}>
        <div className="border-r-[2.5px] border-[#1a1a18] bg-[#f5f2ed] flex items-center justify-center" style={{ width: 185, height: 155 }}>
          {recipe.photoPreviewUrl ? (
            <img src={recipe.photoPreviewUrl} alt="Foto del plato" className="h-full w-full object-contain block" />
          ) : (
            <span className="rf-mono text-center text-[11px] uppercase tracking-[0.1em] text-[#aaaaaa] leading-relaxed">
              📷<br />Sin foto
            </span>
          )}
        </div>
        <div className="flex flex-col justify-center bg-white px-[18px] py-[12px]">
          <p className="rf-mono text-[10px] uppercase tracking-[0.16em] text-[#999999] mb-[6px]">
            {recipe.category || 'Categoría'}
          </p>
          <h1 className="text-[28px] font-bold leading-[1.05] tracking-tight text-[#1a1a18] mb-[8px]">
            {recipe.name || 'Nombre del Plato'}
          </h1>
          <p className="border-t border-[#e0e0e0] pt-[6px] text-[12px] leading-[1.45] text-[#555555]">
            {recipe.description || 'Descripción del plato aparecerá aquí.'}
          </p>
        </div>
      </div>

      {/* ── STATS BAR ── */}
      <div className="flex border-b-[2.5px] border-[#1a1a18] bg-[#f5f5f5]">
        {[
          [recipe.servings || '—', 'Raciones'],
          [yieldDisplay, 'Rendimiento'],
          [parseDecimal(recipe.prep_time_value) ? `${fmtDecimal(recipe.prep_time_value)} ${recipe.prep_time_unit || 'min'}` : '—', 'Preparación'],
          [parseDecimal(recipe.cook_time_value) ? `${fmtDecimal(recipe.cook_time_value)} ${recipe.cook_time_unit || 'min'}` : '—', 'Cocción'],
          [shelfLife, 'Vida útil'],
        ].map(([value, label], i, arr) => (
          <div
            key={label}
            className={`flex flex-1 flex-col items-center gap-[2px] py-[8px] px-0 text-center ${i < arr.length - 1 ? 'border-r border-[#dddddd]' : ''}`}
          >
            <span className="text-[16px] font-bold leading-none text-[#1a1a18]">{value}</span>
            <span className="rf-mono text-[9px] uppercase tracking-[0.06em] text-[#888888]">{label}</span>
          </div>
        ))}
      </div>

      {/* ── BODY ── */}
      <div className="grid flex-1 border-b-[2.5px] border-[#1a1a18]" style={{ gridTemplateColumns: '185px 1fr' }}>

        {/* INGREDIENTES */}
        <aside className="border-r-[2.5px] border-[#1a1a18] bg-white px-[10px] py-[9px] overflow-hidden flex flex-col">
          <div className="rf-mono mb-[8px] flex items-center gap-[4px] text-[9.5px] font-medium uppercase tracking-[0.1em] text-[#1a1a18]">
            Ingredientes
            <span className="h-[0.5px] flex-1 bg-[#cccccc]" />
          </div>
          <div className="space-y-[9px]">
            {ingredients.length ? (
              ingredients.map(([groupName, items]) => (
                <div key={groupName}>
                  <p className="mb-[3px] border-l-[2px] border-[#1a1a18] pl-[5px] text-[10px] font-bold uppercase tracking-[0.04em] text-[#1a1a18]">
                    {groupName}
                  </p>
                  <div>
                    {items.map((item, idx) => (
                      <div
                        key={`${groupName}-${idx}`}
                        className="grid border-b border-[#eeeeee] py-[3px] last:border-b-0"
                        style={{ gridTemplateColumns: '48px 1fr' }}
                      >
                        <span className="rf-mono border-r border-[#cccccc] pr-[5px] text-right text-[11px] font-medium text-[#1a1a18]">
                          {fmtQty(item.quantity)} {item.unit || ''}
                        </span>
                        <span className="pl-[6px] text-[11px] leading-[1.25] text-[#1a1a18]">
                          {item.ingredient_name || 'Insumo'}
                          {item.note ? (
                            <span className="block text-[9.5px] text-[#888888]">{item.note}</span>
                          ) : null}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            ) : (
              <p className="rf-mono text-[11px] text-[#bbbbbb]">Los ingredientes aparecerán aquí</p>
            )}
          </div>

          {/* OBSERVACIONES — pegado al fondo de la columna */}
          {recipe.observations?.trim() ? (
            <div className="mt-auto pt-[8px]">
              <div className="border-t-[1.5px] border-[#1a1a18] pt-[6px]">
                <p className="rf-mono mb-[3px] text-[8px] font-medium uppercase tracking-[0.12em] text-[#1a1a18]">
                  Observaciones
                </p>
                <p className="text-[10px] leading-[1.4] text-[#333333]">
                  {recipe.observations}
                </p>
              </div>
            </div>
          ) : null}
        </aside>

        {/* PASOS */}
        <section className="bg-[#fafafa] px-[12px] py-[9px] overflow-hidden">
          <div className="rf-mono mb-[8px] flex items-center gap-[4px] text-[9.5px] font-medium uppercase tracking-[0.1em] text-[#1a1a18]">
            Proceso paso a paso
            <span className="h-[0.5px] flex-1 bg-[#cccccc]" />
          </div>
          {steps.length ? (
            <div className="flex flex-col">
              {steps.map((step, idx) => (
                <div key={`step-${idx}`} className="relative grid" style={{ gridTemplateColumns: '29px 1fr' }}>
                  {idx < steps.length - 1 && (
                    <div className="absolute bg-[#dddddd]" style={{ left: 14, top: 29, bottom: -2, width: 1.5 }} />
                  )}
                  <div className="relative z-10 flex flex-col items-center pt-[1px]">
                    <div className="rf-mono flex h-[26px] w-[26px] items-center justify-center rounded-full bg-[#1a1a18] text-[11px] font-medium text-[#c8870a]">
                      {idx + 1}
                    </div>
                  </div>
                  <div className="pb-[9px] pl-[8px] pt-[1px]">
                    {step.title ? (
                      <p className="mb-[2px] text-[11.5px] font-bold uppercase tracking-[0.03em] text-[#1a1a18]">
                        {step.title}
                      </p>
                    ) : null}
                    {step.instruction ? (
                      <p className="text-[11.5px] leading-[1.45] text-[#333333]">{step.instruction}</p>
                    ) : null}
                    {step.tip ? (
                      <span className="mt-[3px] block border-l-[2px] border-[#c8870a] bg-[#fdf6e8] px-[6px] py-[3px] text-[10.5px] leading-[1.35] text-[#7a5010]">
                        {step.tip}
                      </span>
                    ) : null}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="rf-mono text-[11px] text-[#bbbbbb]">Los pasos de elaboración aparecerán aquí</p>
          )}
        </section>
      </div>

      {/* ── FOOTER ── */}
      <div className="flex items-center justify-between border-t-[2.5px] border-[#1a1a18] bg-[#f5f5f5] px-[14px] py-[5px]">
        <span className="rf-mono text-[9px] uppercase tracking-[0.05em] text-[#888888]">
          Leche de Tigre · Cocina · Producción
        </span>
        <span className="rf-mono text-[9px] font-medium tracking-[0.07em] text-[#1a1a18]">
          {recipe.code || 'FT-000'} · {revLabel}
        </span>
        <span className="rf-mono text-[9px] uppercase tracking-[0.05em] text-[#888888]">
          1 / 1 · {new Date().toLocaleDateString('es-ES', { month: 'long', year: 'numeric' })}
        </span>
      </div>
    </div>
  )
}

export default RecipeSheetPreview

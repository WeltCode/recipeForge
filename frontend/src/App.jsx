import { useMemo, useState } from 'react'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const emptyIngredient = {
  group_name: '',
  ingredient_name: '',
  quantity: '0',
  unit: 'g',
  note: '',
}

const emptyStep = {
  title: '',
  instruction: '',
  tip: '',
}

function App() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [form, setForm] = useState({
    code: '',
    name: '',
    category: '',
    description: '',
    servings: 1,
    yield_grams: '',
    prep_time_min: 0,
    cook_time_min: 0,
    service_temp_c: '',
    notes: '',
    ingredients: [{ ...emptyIngredient }],
    steps: [{ ...emptyStep }],
  })

  const totalTime = useMemo(
    () => Number(form.prep_time_min || 0) + Number(form.cook_time_min || 0),
    [form.prep_time_min, form.cook_time_min],
  )

  const updateField = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const updateIngredient = (index, field, value) => {
    setForm((prev) => {
      const ingredients = [...prev.ingredients]
      ingredients[index] = { ...ingredients[index], [field]: value }
      return { ...prev, ingredients }
    })
  }

  const updateStep = (index, field, value) => {
    setForm((prev) => {
      const steps = [...prev.steps]
      steps[index] = { ...steps[index], [field]: value }
      return { ...prev, steps }
    })
  }

  const addIngredient = () => {
    setForm((prev) => ({ ...prev, ingredients: [...prev.ingredients, { ...emptyIngredient }] }))
  }

  const removeIngredient = (index) => {
    setForm((prev) => {
      const ingredients = prev.ingredients.filter((_, current) => current !== index)
      return { ...prev, ingredients: ingredients.length ? ingredients : [{ ...emptyIngredient }] }
    })
  }

  const addStep = () => {
    setForm((prev) => ({ ...prev, steps: [...prev.steps, { ...emptyStep }] }))
  }

  const removeStep = (index) => {
    setForm((prev) => {
      const steps = prev.steps.filter((_, current) => current !== index)
      return { ...prev, steps: steps.length ? steps : [{ ...emptyStep }] }
    })
  }

  const buildPayload = () => ({
    code: form.code,
    name: form.name,
    category: form.category,
    description: form.description,
    servings: Number(form.servings || 1),
    yield_grams: form.yield_grams ? Number(form.yield_grams) : null,
    prep_time_min: Number(form.prep_time_min || 0),
    cook_time_min: Number(form.cook_time_min || 0),
    service_temp_c: form.service_temp_c ? Number(form.service_temp_c) : null,
    notes: form.notes,
    ingredients: form.ingredients
      .filter((item) => item.ingredient_name.trim())
      .map((item, index) => ({
        ...item,
        quantity: Number(item.quantity || 0),
        order: index + 1,
      })),
    steps: form.steps
      .filter((item) => item.title.trim() && item.instruction.trim())
      .map((item, index) => ({
        ...item,
        step_number: index + 1,
        order: index + 1,
      })),
  })

  const resetForm = () => {
    setForm({
      code: '',
      name: '',
      category: '',
      description: '',
      servings: 1,
      yield_grams: '',
      prep_time_min: 0,
      cook_time_min: 0,
      service_temp_c: '',
      notes: '',
      ingredients: [{ ...emptyIngredient }],
      steps: [{ ...emptyStep }],
    })
  }

  const submitRecipe = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch(`${API_BASE}/recipes/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(buildPayload()),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(JSON.stringify(errorData))
      }

      const data = await response.json()
      setMessage(`Receta guardada correctamente: ${data.code} - ${data.name}`)
      resetForm()
    } catch (error) {
      setMessage(`No se pudo guardar la receta. ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl p-6 md:p-10">
      <section className="rounded-2xl border border-stone-300 bg-white p-6 shadow-sm md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
          RecipeForge
        </p>
        <h1 className="mt-3 text-3xl font-bold text-stone-900">Nueva ficha tecnica</h1>
        <p className="mt-2 text-stone-700">
          Formulario dinamico para registrar receta, ingredientes y proceso de produccion.
        </p>

        <form className="mt-8 space-y-8" onSubmit={submitRecipe}>
          <div className="grid gap-4 md:grid-cols-3">
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Codigo
              <input
                required
                value={form.code}
                onChange={(e) => updateField('code', e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2"
                placeholder="FT-001"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-700 md:col-span-2">
              Nombre de receta
              <input
                required
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2"
                placeholder="Aji de gallina"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Categoria
              <input
                value={form.category}
                onChange={(e) => updateField('category', e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2"
                placeholder="Plato principal"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Porciones
              <input
                type="number"
                min="1"
                value={form.servings}
                onChange={(e) => updateField('servings', e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Rendimiento (g)
              <input
                type="number"
                min="0"
                value={form.yield_grams}
                onChange={(e) => updateField('yield_grams', e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Prep (min)
              <input
                type="number"
                min="0"
                value={form.prep_time_min}
                onChange={(e) => updateField('prep_time_min', e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Coccion (min)
              <input
                type="number"
                min="0"
                value={form.cook_time_min}
                onChange={(e) => updateField('cook_time_min', e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Temp. servicio (C)
              <input
                type="number"
                min="0"
                step="0.1"
                value={form.service_temp_c}
                onChange={(e) => updateField('service_temp_c', e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2"
              />
            </label>
            <div className="flex items-end rounded-md border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600">
              Tiempo total: {totalTime} min
            </div>
          </div>

          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Descripcion
            <textarea
              rows="3"
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-2"
            />
          </label>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-stone-900">Ingredientes</h2>
              <button
                type="button"
                onClick={addIngredient}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-800"
              >
                Agregar insumo
              </button>
            </div>

            {form.ingredients.map((item, index) => (
              <div key={`ingredient-${index}`} className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-12">
                <input
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm md:col-span-2"
                  placeholder="Grupo"
                  value={item.group_name}
                  onChange={(e) => updateIngredient(index, 'group_name', e.target.value)}
                />
                <input
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm md:col-span-4"
                  placeholder="Insumo"
                  value={item.ingredient_name}
                  onChange={(e) => updateIngredient(index, 'ingredient_name', e.target.value)}
                />
                <input
                  type="number"
                  step="0.001"
                  min="0"
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm md:col-span-2"
                  placeholder="Cantidad"
                  value={item.quantity}
                  onChange={(e) => updateIngredient(index, 'quantity', e.target.value)}
                />
                <input
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm md:col-span-1"
                  placeholder="Unidad"
                  value={item.unit}
                  onChange={(e) => updateIngredient(index, 'unit', e.target.value)}
                />
                <input
                  className="rounded-md border border-stone-300 px-3 py-2 text-sm md:col-span-2"
                  placeholder="Nota"
                  value={item.note}
                  onChange={(e) => updateIngredient(index, 'note', e.target.value)}
                />
                <button
                  type="button"
                  onClick={() => removeIngredient(index)}
                  className="rounded-md border border-red-200 px-3 py-2 text-sm text-red-700 md:col-span-1"
                >
                  Quitar
                </button>
              </div>
            ))}
          </section>

          <section className="space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-stone-900">Proceso paso a paso</h2>
              <button
                type="button"
                onClick={addStep}
                className="rounded-md border border-stone-300 px-3 py-1.5 text-sm text-stone-800"
              >
                Agregar paso
              </button>
            </div>

            {form.steps.map((item, index) => (
              <div key={`step-${index}`} className="space-y-3 rounded-lg border border-stone-200 p-3">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-stone-800">Paso {index + 1}</p>
                  <button
                    type="button"
                    onClick={() => removeStep(index)}
                    className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700"
                  >
                    Quitar
                  </button>
                </div>
                <input
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  placeholder="Titulo del paso"
                  value={item.title}
                  onChange={(e) => updateStep(index, 'title', e.target.value)}
                />
                <textarea
                  rows="3"
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  placeholder="Instrucciones"
                  value={item.instruction}
                  onChange={(e) => updateStep(index, 'instruction', e.target.value)}
                />
                <input
                  className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                  placeholder="Tip tecnico (opcional)"
                  value={item.tip}
                  onChange={(e) => updateStep(index, 'tip', e.target.value)}
                />
              </div>
            ))}
          </section>

          <label className="flex flex-col gap-1 text-sm text-stone-700">
            Notas finales
            <textarea
              rows="3"
              value={form.notes}
              onChange={(e) => updateField('notes', e.target.value)}
              className="rounded-md border border-stone-300 px-3 py-2"
            />
          </label>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              {loading ? 'Guardando...' : 'Guardar receta'}
            </button>
            <button
              type="button"
              onClick={resetForm}
              className="rounded-md border border-stone-300 px-4 py-2 text-sm font-medium text-stone-700"
            >
              Limpiar formulario
            </button>
          </div>
        </form>

        {message ? (
          <p className="mt-5 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {message}
          </p>
        ) : null}
      </section>
    </main>
  )
}

export default App

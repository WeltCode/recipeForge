import { useEffect, useMemo, useState } from 'react'
import RecipeSheetPreview from './components/RecipeSheetPreview'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'
import { ArrowLeft } from './components/icons'
import { authFetch, isAuthenticated, getRole, getUsername, getRestaurantName, logout } from './auth'
import rfLogo from './assets/logorecipe.png'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const CATEGORIES = [
  'Plato Fuerte',
  'Entrante',
  'Aderezos y Salsas',
  'Sopas y Cremas',
  'Ensaladas',
  'Postres',
  'Panes y Masas',
  'Bebidas',
  'Fondos y Caldos',
  'Guarniciones',
  'Tapas y Aperitivos',
  'Snacks',
  'Fermentados',
  'Pre-elaborados',
]

const INGREDIENT_GROUPS = [
  'Proteinas',
  'Vegetales',
  'Lacteos',
  'Salsas y fondos',
  'Especias y condimentos',
  'Frutas',
  'Almidones',
  'Aceites y grasas',
  'Hierbas frescas',
  'Mariscos',
  'Embutidos',
  'Otros',
]

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

// Detecta el prefijo más usado en la lista de recetas (ej. "LT" de "LT-001")
function detectPrefix(list) {
  const prefixes = list
    .map((r) => r.code?.match(/^([A-Z]{1,6})-\d+$/i)?.[1]?.toUpperCase())
    .filter(Boolean)
  if (!prefixes.length) return 'LT'
  // Devuelve el más frecuente
  return prefixes
    .sort((a, b) => prefixes.filter((v) => v === b).length - prefixes.filter((v) => v === a).length)[0]
}

// Genera el siguiente código disponible: prefijo + número correlativo con 3 dígitos
function generateNextCode(prefix, list) {
  const pattern = new RegExp(`^${prefix}-(\\d+)$`, 'i')
  const numbers = list
    .map((r) => r.code?.match(pattern)?.[1])
    .filter(Boolean)
    .map(Number)
  const max = numbers.length ? Math.max(...numbers) : 0
  return `${prefix.toUpperCase()}-${String(max + 1).padStart(3, '0')}`
}

const emptyForm = {
  code: '',
  name: '',
  category: '',
  description: '',
  servings: 1,
  yield_quantity: '',
  yield_unit: 'g',
  prep_time_value: 0,
  prep_time_unit: 'min',
  cook_time_value: 0,
  cook_time_unit: 'min',
  shelf_life_value: '',
  shelf_life_unit: 'dias',
  observations: '',
  ingredients: [{ ...emptyIngredient }],
  steps: [{ ...emptyStep }],
}

function App() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [savedRecipeId, setSavedRecipeId] = useState(null)
  const [photoFile, setPhotoFile] = useState(null)
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState(null)
  const [recipeList, setRecipeList] = useState([])
  const [editingRecipeId, setEditingRecipeId] = useState(null)
  const [connectionError, setConnectionError] = useState(false)
  const [codePrefix, setCodePrefix] = useState('LT')
  const [freshAfterSave, setFreshAfterSave] = useState(null)

  // ── Sesión / rol ──
  const [authed, setAuthed] = useState(isAuthenticated())
  const [role, setRole] = useState(getRole())
  const [view, setView] = useState('dashboard') // 'dashboard' | 'editor'
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null)
  const username = getUsername()
  const restaurantName = getRestaurantName()
  const isSuperAdmin = role === 'superadmin'
  const canCreate = role === 'premium' || role === 'superadmin'
  const canDelete = canCreate

  const handleLogout = () => {
    logout()
    setAuthed(false)
    setRole(null)
    setView('dashboard')
    setSelectedRestaurantId(null)
  }

  // ── Navegación panel ↔ editor ──
  const openNewRecipe = () => {
    resetForm()
    setView('editor')
    window.scrollTo({ top: 0 })
  }
  const openRecipe = async (id) => {
    await loadRecipeForEdit(id)
    setView('editor')
  }
  const backToDashboard = () => {
    fetchRecipeList()
    setView('dashboard')
    window.scrollTo({ top: 0 })
  }

  const exportRecipeId = new URL(window.location.href).searchParams.get('export')
  const isExportMode = Boolean(exportRecipeId)
  const [exportRecipe, setExportRecipe] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [printScheduled, setPrintScheduled] = useState(false)

  const [form, setForm] = useState({ ...emptyForm })

  // Convierte el tiempo a minutos para calcular el total
  const toMinutes = (value, unit) => {
    const n = Number(value || 0)
    return unit === 'h' ? n * 60 : n
  }
  const totalTime = useMemo(
    () => toMinutes(form.prep_time_value, form.prep_time_unit) + toMinutes(form.cook_time_value, form.cook_time_unit),
    [form.prep_time_value, form.prep_time_unit, form.cook_time_value, form.cook_time_unit],
  )

  const updateField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }))

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

  const addIngredient = () =>
    setForm((prev) => ({ ...prev, ingredients: [...prev.ingredients, { ...emptyIngredient }] }))

  const removeIngredient = (index) =>
    setForm((prev) => {
      const ingredients = prev.ingredients.filter((_, i) => i !== index)
      return { ...prev, ingredients: ingredients.length ? ingredients : [{ ...emptyIngredient }] }
    })

  const addStep = () =>
    setForm((prev) => ({ ...prev, steps: [...prev.steps, { ...emptyStep }] }))

  const removeStep = (index) =>
    setForm((prev) => {
      const steps = prev.steps.filter((_, i) => i !== index)
      return { ...prev, steps: steps.length ? steps : [{ ...emptyStep }] }
    })

  const buildPayload = () => ({
    // El super admin crea recetas dentro del restaurante que está gestionando
    ...(isSuperAdmin && selectedRestaurantId && !editingRecipeId
      ? { restaurant: selectedRestaurantId }
      : {}),
    code: form.code,
    name: form.name,
    category: form.category,
    description: form.description,
    servings: Number(form.servings || 1),
    yield_quantity: form.yield_quantity ? Number(form.yield_quantity) : null,
    yield_unit: form.yield_unit || 'g',
    prep_time_value: Number(form.prep_time_value || 0),
    prep_time_unit: form.prep_time_unit || 'min',
    cook_time_value: Number(form.cook_time_value || 0),
    cook_time_unit: form.cook_time_unit || 'min',
    shelf_life_value: form.shelf_life_value ? Number(form.shelf_life_value) : null,
    shelf_life_unit: form.shelf_life_unit || 'dias',
    observations: form.observations,
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
    // Si hay datos frescos del último guardado, usarlos para el siguiente código
    const list = freshAfterSave?.list ?? recipeList
    const prefix = freshAfterSave?.prefix ?? codePrefix
    setSavedRecipeId(null)
    setEditingRecipeId(null)
    setFreshAfterSave(null)
    setPhotoFile(null)
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(null)
    setForm({
      ...emptyForm,
      code: generateNextCode(prefix, list),
      ingredients: [{ ...emptyIngredient }],
      steps: [{ ...emptyStep }],
    })
    setMessage('')
  }

  const handlePhotoChange = (e) => {
    const file = e.target.files?.[0] ?? null
    setPhotoFile(file)
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(file ? URL.createObjectURL(file) : null)
  }

  // Devuelve la lista actualizada para que quien la llame pueda usarla de inmediato
  const fetchRecipeList = async () => {
    try {
      const res = await authFetch(`${API_BASE}/recipes/`)
      if (!res.ok) throw new Error(`El servidor respondió con error ${res.status}`)
      const data = await res.json()
      setRecipeList(data)
      setConnectionError(false)
      const detected = detectPrefix(data)
      setCodePrefix(detected)
      return { list: data, prefix: detected }
    } catch (err) {
      const isNetworkError = err instanceof TypeError
      setConnectionError(true)
      setMessage(
        isNetworkError
          ? `No se pudo conectar con el servidor (${API_BASE}). ¿Está el backend corriendo? Ejecuta "python manage.py runserver".`
          : `Error al cargar las recetas: ${err.message}`,
      )
      return null
    }
  }

  const loadRecipeForEdit = async (recipeId) => {
    setMessage('')
    try {
      const res = await authFetch(`${API_BASE}/recipes/${recipeId}/`)
      if (!res.ok) throw new Error('No se pudo cargar la receta')
      const data = await res.json()
      setEditingRecipeId(recipeId)
      setSavedRecipeId(recipeId)
      setPhotoFile(null)
      if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
      setPhotoPreviewUrl(data.final_photo || null)
      setForm({
        code: data.code || '',
        name: data.name || '',
        category: data.category || '',
        description: data.description || '',
        servings: data.servings || 1,
        yield_quantity: data.yield_quantity ?? '',
        yield_unit: data.yield_unit || 'g',
        prep_time_value: data.prep_time_value || 0,
        prep_time_unit: data.prep_time_unit || 'min',
        cook_time_value: data.cook_time_value || 0,
        cook_time_unit: data.cook_time_unit || 'min',
        shelf_life_value: data.shelf_life_value ?? '',
        shelf_life_unit: data.shelf_life_unit || 'dias',
        observations: data.observations || '',
        ingredients: data.ingredients?.length
          ? data.ingredients.map((ing) => ({
              group_name: ing.group_name || '',
              ingredient_name: ing.ingredient_name || '',
              quantity: String(ing.quantity || 0),
              unit: ing.unit || 'g',
              note: ing.note || '',
            }))
          : [{ ...emptyIngredient }],
        steps: data.steps?.length
          ? data.steps.map((s) => ({
              title: s.title || '',
              instruction: s.instruction || '',
              tip: s.tip || '',
            }))
          : [{ ...emptyStep }],
      })
      setShowList(false)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (err) {
      setMessage(`Error al cargar la receta: ${err.message}`)
    }
  }

  const deleteRecipe = async (recipeId, recipeName) => {
    if (!window.confirm(`¿Eliminar "${recipeName}"? Esta acción no se puede deshacer.`)) return
    try {
      const res = await authFetch(`${API_BASE}/recipes/${recipeId}/`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Error al eliminar')
      setMessage(`Receta "${recipeName}" eliminada.`)
      fetchRecipeList()
      if (editingRecipeId === recipeId) resetForm()
    } catch (err) {
      setMessage(`No se pudo eliminar: ${err.message}`)
    }
  }

  const downloadPDF = (recipeId) => {
    window.open(`${window.location.origin}/?export=${recipeId}`, '_blank', 'width=1000,height=800')
  }

  useEffect(() => {
    if (!authed) return
    if (!exportRecipeId) {
      // Cargar recetas y luego auto-generar el código inicial del formulario
      const init = async () => {
        try {
          const res = await authFetch(`${API_BASE}/recipes/`)
          if (!res.ok) throw new Error(`Error ${res.status}`)
          const data = await res.json()
          setRecipeList(data)
          setConnectionError(false)
          const detected = detectPrefix(data)
          setCodePrefix(detected)
          // Auto-rellenar el código en el formulario vacío inicial
          setForm((prev) => ({
            ...prev,
            code: prev.code || generateNextCode(detected, data),
          }))
        } catch (err) {
          setConnectionError(true)
          setMessage(
            err instanceof TypeError
              ? `No se pudo conectar con el servidor (${API_BASE}). ¿Está el backend corriendo? Ejecuta "python manage.py runserver".`
              : `Error al cargar las recetas: ${err.message}`,
          )
        }
      }
      init()
      return
    }
    const loadExportRecipe = async () => {
      setExportLoading(true)
      try {
        const response = await authFetch(`${API_BASE}/recipes/${exportRecipeId}/`)
        if (!response.ok) throw new Error('No se encontró la receta')
        const data = await response.json()
        setExportRecipe({ ...data, photoPreviewUrl: data.final_photo || null })
      } catch (error) {
        setMessage(`No se pudo cargar la ficha: ${error.message}`)
      } finally {
        setExportLoading(false)
      }
    }
    loadExportRecipe()
  }, [exportRecipeId, authed])

  useEffect(() => {
    if (isExportMode && exportRecipe && !exportLoading && !printScheduled) {
      document.title = `${exportRecipe.code || 'FT-000'} | ${exportRecipe.name || 'Receta'}`
      setPrintScheduled(true)
      setTimeout(() => window.print(), 600)
    }
  }, [isExportMode, exportRecipe, exportLoading, printScheduled])

  const submitRecipe = async (event) => {
    event.preventDefault()
    setLoading(true)
    setMessage('')

    const isEdit = Boolean(editingRecipeId)
    const url = isEdit ? `${API_BASE}/recipes/${editingRecipeId}/` : `${API_BASE}/recipes/`
    const method = isEdit ? 'PUT' : 'POST'

    try {
      let response
      if (photoFile) {
        const formData = new FormData()
        const payload = buildPayload()
        formData.append('final_photo', photoFile)
        Object.entries(payload).forEach(([key, value]) => {
          if (key === 'ingredients' || key === 'steps') {
            formData.append(key, JSON.stringify(value))
          } else if (value !== null && value !== undefined) {
            formData.append(key, value)
          }
        })
        response = await authFetch(url, { method, body: formData })
      } else {
        response = await authFetch(url, {
          method,
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(buildPayload()),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(JSON.stringify(errorData))
      }

      const data = await response.json()
      setSavedRecipeId(data.id)
      setEditingRecipeId(data.id)
      const revLabel = `Rev.0.${data.revision}`
      setMessage(
        isEdit
          ? `Receta actualizada: ${data.code} - ${data.name} (${revLabel})`
          : `Receta guardada: ${data.code} - ${data.name}`,
      )
      // Traer la lista actualizada (incluye la receta recién guardada)
      // y guardarla en un ref para que resetForm pueda calcular el siguiente código
      const fresh = await fetchRecipeList()
      if (fresh) setFreshAfterSave(fresh)
    } catch (error) {
      setMessage(`Error al guardar. ${error.message}`)
    } finally {
      setLoading(false)
    }
  }

  // ── SIN SESIÓN: pantalla de login ─────────────────────────────────────────
  if (!authed) {
    return (
      <Login
        onSuccess={(data) => {
          setAuthed(true)
          setRole(data.role)
          setView('dashboard')
        }}
      />
    )
  }

  // ── MODO EXPORTACIÓN ──────────────────────────────────────────────────────
  if (isExportMode) {
    return (
      <div style={{ margin: 0, padding: 0, background: 'white' }}>
        {exportLoading || !exportRecipe ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            Cargando ficha técnica para exportación...
          </div>
        ) : (
          <RecipeSheetPreview recipe={exportRecipe} />
        )}
      </div>
    )
  }

  // ── DASHBOARD (pantalla de inicio tras login) ─────────────────────────────
  if (view === 'dashboard') {
    return (
      <>
        {connectionError && (
          <div className="mx-auto max-w-6xl px-5 pt-4 md:px-8">
            <div className="flex items-start gap-3 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3">
              <span className="text-xl leading-none">⚠️</span>
              <div className="flex-1">
                <p className="text-sm font-semibold text-red-800">Sin conexión con el servidor</p>
                <p className="mt-1 text-sm text-red-700">
                  No se pudo contactar con el backend. Tus recetas no se han perdido, solo no se
                  pueden mostrar mientras el servidor esté apagado.
                </p>
                <button
                  type="button"
                  onClick={fetchRecipeList}
                  className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
                >
                  Reintentar conexión
                </button>
              </div>
            </div>
          </div>
        )}
        {isSuperAdmin ? (
          <AdminDashboard
            username={username}
            recipes={recipeList}
            canDelete={canDelete}
            onLogout={handleLogout}
            selectedRestaurantId={selectedRestaurantId}
            onSelectRestaurant={setSelectedRestaurantId}
            onBackToRestaurants={() => setSelectedRestaurantId(null)}
            onOpenRecipe={openRecipe}
            onNewRecipe={openNewRecipe}
            onDeleteRecipe={deleteRecipe}
            onDownloadPDF={downloadPDF}
          />
        ) : (
          <Dashboard
            username={username}
            role={role}
            restaurantName={restaurantName}
            recipes={recipeList}
            canCreate={canCreate}
            canDelete={canDelete}
            onNew={openNewRecipe}
            onEdit={openRecipe}
            onDelete={deleteRecipe}
            onDownloadPDF={downloadPDF}
            onLogout={handleLogout}
          />
        )}
      </>
    )
  }

  // ── EDITOR (crear / editar ficha) ─────────────────────────────────────────
  return (
    <main className="mx-auto min-h-screen w-full p-6 md:p-8">
      <section className="rounded-2xl border border-stone-300 bg-white p-6 shadow-sm md:p-8">
        {/* Volver al panel */}
        <button
          type="button"
          onClick={backToDashboard}
          className="mb-5 flex items-center gap-2 rounded-lg border border-stone-300 px-3 py-1.5 text-sm font-medium text-stone-700 transition hover:bg-stone-50"
        >
          <ArrowLeft size={17} /> Volver al panel
        </button>
        {connectionError && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border-2 border-red-300 bg-red-50 px-4 py-3">
            <span className="text-xl leading-none">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-red-800">Sin conexión con el servidor</p>
              <p className="mt-1 text-sm text-red-700">
                No se pudo contactar con el backend en <code className="rounded bg-red-100 px-1 font-mono text-xs">{API_BASE}</code>.
                Asegúrate de que el servidor Django esté corriendo
                (<code className="rounded bg-red-100 px-1 font-mono text-xs">python manage.py runserver</code>).
                Tus recetas no se han perdido, solo no se pueden mostrar mientras el servidor esté apagado.
              </p>
              <button
                type="button"
                onClick={fetchRecipeList}
                className="mt-2 rounded-md border border-red-300 bg-white px-3 py-1.5 text-xs font-medium text-red-700 hover:bg-red-100"
              >
                Reintentar conexión
              </button>
            </div>
          </div>
        )}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <img src={rfLogo} alt="RecipeForge" className="h-10 w-auto object-contain" />
          <div className="flex items-center gap-3 text-sm">
            <span className="text-stone-600">
              {username}
              <span className={`ml-2 rounded-full px-2 py-0.5 text-xs font-medium ${
                role === 'superadmin'
                  ? 'bg-indigo-100 text-indigo-800'
                  : role === 'premium'
                    ? 'bg-amber-100 text-amber-800'
                    : 'bg-stone-200 text-stone-700'
              }`}>
                {role === 'superadmin' ? 'Super Admin' : role === 'premium' ? 'Premium' : 'Básico'}
              </span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-md border border-stone-300 px-3 py-1.5 text-xs font-medium text-stone-700 hover:bg-stone-50"
            >
              Cerrar sesión
            </button>
          </div>
        </div>
        <h1 className="mt-3 text-3xl font-bold text-stone-900">
          {editingRecipeId ? `Editando: ${form.code} — ${form.name}` : 'Nueva ficha técnica'}
        </h1>
        <p className="mt-2 text-stone-700">
          {editingRecipeId
            ? 'Modifica los campos y guarda para actualizar la revisión automáticamente.'
            : 'Formulario dinámico para registrar receta, ingredientes y proceso de producción.'}
        </p>

        <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
          <form className="space-y-8 rounded-3xl border border-stone-200 bg-stone-50 p-5 md:p-6" onSubmit={submitRecipe}>

            {/* ── INFO BÁSICA ── */}
            <div className="grid gap-4 md:grid-cols-3">
              <div className="flex flex-col gap-1 text-sm text-stone-700">
                <span>Código</span>
                {/* Prefijo + código en una sola fila, contenida */}
                <div className="flex gap-1 items-center min-w-0">
                  <input
                    value={codePrefix}
                    onChange={(e) => setCodePrefix(e.target.value.toUpperCase())}
                    className="w-10 shrink-0 rounded-md border border-stone-300 px-1 py-2 text-center font-mono text-sm uppercase"
                    placeholder="LT"
                    title="Prefijo (ej. LT = Leche de Tigre)"
                    disabled={Boolean(editingRecipeId)}
                  />
                  <input
                    required
                    value={form.code}
                    onChange={(e) => updateField('code', e.target.value.toUpperCase())}
                    className="w-full min-w-0 rounded-md border border-stone-300 px-2 py-2 font-mono text-sm"
                    placeholder="LT-001"
                  />
                </div>
                {/* Botón Auto debajo, solo en modo nuevo */}
                {!editingRecipeId && (
                  <button
                    type="button"
                    onClick={() => updateField('code', generateNextCode(codePrefix, recipeList))}
                    className="self-start text-xs text-amber-700 underline hover:text-amber-900"
                  >
                    ↻ Generar automáticamente
                  </button>
                )}
              </div>
              <label className="flex flex-col gap-1 text-sm text-stone-700 md:col-span-2">
                Nombre de receta
                <input
                  required
                  value={form.name}
                  onChange={(e) => updateField('name', e.target.value)}
                  className="rounded-md border border-stone-300 px-3 py-2"
                  placeholder="Ají de gallina"
                />
              </label>
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Categoría
                <select
                  value={form.category}
                  onChange={(e) => updateField('category', e.target.value)}
                  className="rounded-md border border-stone-300 px-3 py-2 bg-white"
                >
                  <option value="">— Seleccionar —</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>{cat}</option>
                  ))}
                </select>
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
                Rendimiento
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    step="0.001"
                    value={form.yield_quantity}
                    onChange={(e) => updateField('yield_quantity', e.target.value)}
                    className="flex-1 rounded-md border border-stone-300 px-3 py-2"
                    placeholder="0"
                  />
                  <select
                    value={form.yield_unit}
                    onChange={(e) => updateField('yield_unit', e.target.value)}
                    className="rounded-md border border-stone-300 px-3 py-2 bg-white"
                  >
                    <option value="g">g</option>
                    <option value="kg">kg</option>
                  </select>
                </div>
              </label>
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Preparación
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={form.prep_time_value}
                    onChange={(e) => updateField('prep_time_value', e.target.value)}
                    className="flex-1 rounded-md border border-stone-300 px-3 py-2"
                    placeholder="0"
                  />
                  <select
                    value={form.prep_time_unit}
                    onChange={(e) => updateField('prep_time_unit', e.target.value)}
                    className="rounded-md border border-stone-300 px-3 py-2 bg-white"
                  >
                    <option value="min">min</option>
                    <option value="h">horas</option>
                  </select>
                </div>
              </label>
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Cocción
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={form.cook_time_value}
                    onChange={(e) => updateField('cook_time_value', e.target.value)}
                    className="flex-1 rounded-md border border-stone-300 px-3 py-2"
                    placeholder="0"
                  />
                  <select
                    value={form.cook_time_unit}
                    onChange={(e) => updateField('cook_time_unit', e.target.value)}
                    className="rounded-md border border-stone-300 px-3 py-2 bg-white"
                  >
                    <option value="min">min</option>
                    <option value="h">horas</option>
                  </select>
                </div>
              </label>
              <label className="flex flex-col gap-1 text-sm text-stone-700">
                Vida útil
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="0"
                    value={form.shelf_life_value}
                    onChange={(e) => updateField('shelf_life_value', e.target.value)}
                    className="w-20 rounded-md border border-stone-300 px-3 py-2"
                    placeholder="0"
                  />
                  <select
                    value={form.shelf_life_unit}
                    onChange={(e) => updateField('shelf_life_unit', e.target.value)}
                    className="rounded-md border border-stone-300 px-3 py-2 bg-white"
                  >
                    <option value="dias">Días</option>
                    <option value="meses">Meses</option>
                  </select>
                </div>
              </label>
              <div className="flex items-end rounded-md border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600">
                Tiempo total: {totalTime >= 60
                  ? `${Math.floor(totalTime / 60)}h ${totalTime % 60 > 0 ? `${totalTime % 60}min` : ''}`.trim()
                  : `${totalTime} min`}
              </div>
            </div>

            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Descripción
              <textarea
                rows="3"
                value={form.description}
                onChange={(e) => updateField('description', e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2"
              />
            </label>

            {/* ── INGREDIENTES ── */}
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
                  <div className="md:col-span-2">
                    <datalist id="group-presets">
                      {INGREDIENT_GROUPS.map((g) => <option key={g} value={g} />)}
                    </datalist>
                    <input
                      list="group-presets"
                      className="w-full rounded-md border border-stone-300 px-3 py-2 text-sm"
                      placeholder="Grupo"
                      value={item.group_name}
                      onChange={(e) => updateIngredient(index, 'group_name', e.target.value)}
                    />
                  </div>
                  <input
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm md:col-span-4"
                    placeholder="Insumo"
                    value={item.ingredient_name}
                    onChange={(e) => updateIngredient(index, 'ingredient_name', e.target.value)}
                  />
                  <input
                    type="number"
                    step="1"
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

            {/* ── PASOS ── */}
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
                    placeholder="Título del paso"
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
                    placeholder="Tip técnico (opcional)"
                    value={item.tip}
                    onChange={(e) => updateStep(index, 'tip', e.target.value)}
                  />
                </div>
              ))}
            </section>

            {/* ── OBSERVACIONES ── */}
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Observaciones
              <textarea
                rows="2"
                value={form.observations}
                onChange={(e) => updateField('observations', e.target.value)}
                className="rounded-md border border-stone-300 px-3 py-2"
                placeholder="Ej: Al momento de producir, hacer la receta x5"
              />
            </label>

            {/* ── FOTO ── */}
            <label className="flex flex-col gap-1 text-sm text-stone-700">
              Foto del plato final
              <input
                type="file"
                accept="image/*"
                onChange={handlePhotoChange}
                className="rounded-md border border-stone-300 px-3 py-2 text-sm file:mr-3 file:rounded file:border-0 file:bg-stone-900 file:px-3 file:py-1 file:text-xs file:font-medium file:text-white"
              />
              {photoPreviewUrl && (
                <img src={photoPreviewUrl} alt="Vista previa" className="mt-2 h-32 w-full rounded-lg object-cover" />
              )}
            </label>

            {/* ── ACCIONES ── */}
            {!canCreate && !editingRecipeId && (
              <p className="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Tu rol (Básico) solo permite <strong>ver y editar</strong> recetas existentes.
                Selecciona una ficha de la lista para editarla.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {(editingRecipeId || canCreate) && (
                <button
                  type="submit"
                  disabled={loading}
                  className="rounded-md bg-stone-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
                >
                  {loading ? 'Guardando...' : editingRecipeId ? 'Actualizar receta' : 'Guardar receta'}
                </button>
              )}
              {(editingRecipeId || canCreate) && (
                <button
                  type="button"
                  onClick={resetForm}
                  className={`rounded-md border px-4 py-2 text-sm font-medium ${
                    savedRecipeId && !editingRecipeId
                      ? 'border-green-400 bg-green-50 text-green-800 hover:bg-green-100'
                      : 'border-stone-300 text-stone-700 hover:bg-stone-50'
                  }`}
                >
                  {editingRecipeId ? 'Cancelar edición' : savedRecipeId ? '+ Crear nueva receta' : 'Limpiar formulario'}
                </button>
              )}
              {savedRecipeId && (
                <button
                  type="button"
                  onClick={() => downloadPDF(savedRecipeId)}
                  className="rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-900 hover:bg-amber-100"
                >
                  Descargar PDF
                </button>
              )}
            </div>
          </form>

          {/* ── PREVIEW ── */}
          <div className="space-y-4">
            <div className="rounded-3xl border border-stone-200 bg-stone-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-stone-500">Vista previa A4</p>
              <p className="mt-1 text-sm text-stone-600">
                La ficha refleja el formulario en vivo con una estructura lista para impresión.
              </p>
            </div>
            <RecipeSheetPreview recipe={{ ...form, photoPreviewUrl }} />
          </div>
        </div>

        {message && (
          <p className="mt-5 rounded-md border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
            {message}
          </p>
        )}
      </section>
    </main>
  )
}

export default App

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react'
import RecipeSheetPreview from './components/RecipeSheetPreview'
import Login from './components/Login'
import Dashboard from './components/Dashboard'
import AdminDashboard from './components/AdminDashboard'
import { ArrowLeft, Doc, RecipeSheet, Coins, Allergen, Users, Gear, Inventory, Truck, Tag, Flame } from './components/icons'
import AppShell from './components/AppShell'
import { LockedSection, UpgradeModal } from './components/FeatureGate'
import AlergenosSection from './components/AlergenosSection'
import ProveedoresSection from './components/ProveedoresSection'
import InventarioSection from './components/InventarioSection'
import CosteoSection from './components/CosteoSection'
import { AllergenPicker } from './components/AllergenPicker'
import { parseDecimal, fmtDecimal } from './lib/ui'
import { TEMPLATES, templateMeta } from './templates'
import { authFetch, isAuthenticated, getRole, hasPerm, feat, getPlan, getUsage, getUsername, getTitle, getRestaurantName, getRestaurantPrefix, getRestaurantLogo, getRestaurantDefaultTemplate, logout, refreshMe, mustChangePassword, IDLE_LIMIT_MS } from './auth'
import { ForcedPasswordScreen } from './components/ChangePassword'
import AjustesSection from './components/AjustesSection'
import Logo from './components/Logo'

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
  quantity: '',
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
  template: 'formal',
  accent_color: '',
  category: '',
  description: '',
  servings: 1,
  yield_quantity: '',
  yield_unit: 'g',
  prep_time_value: '',
  prep_time_unit: 'min',
  cook_time_value: '',
  cook_time_unit: 'min',
  shelf_life_value: '',
  shelf_life_unit: 'dias',
  observations: '',
  allergens: [],
  ingredients: [{ ...emptyIngredient }],
  steps: [{ ...emptyStep }],
}

const ROLE_LABELS = {
  superadmin: 'Super Admin', owner: 'Owner', manager: 'Manager', editor: 'Editor', viewer: 'Viewer',
}

// Escala una hoja A4 (210×297mm ≈ 794×1123px) para que quepa completa en el
// ancho de su columna, manteniendo proporción. Solo para la vista previa en
// pantalla; la exportación/impresión usa el tamaño real.
function ScaledA4({ children }) {
  const A4_W = 794
  const A4_H = 1123
  const ref = useRef(null)
  const [scale, setScale] = useState(0)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () => setScale(el.clientWidth / A4_W)
    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  return (
    <div ref={ref} className="w-full min-w-0 overflow-hidden" style={{ height: scale ? A4_H * scale : 0 }}>
      <div style={{ width: A4_W, height: A4_H, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        {children}
      </div>
    </div>
  )
}

// Sección con contenido aún por construir (placeholder honesto).
function PlaceholderSection({ icon: Icon, title, note }) {
  return (
    <div className="rf-steel rf-edge flex flex-col items-center rounded-3xl border border-[#aeb6bd] px-6 py-16 text-center">
      <span className="flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-white shadow-lg">{Icon && <Icon size={30} />}</span>
      <h2 className="rf-cond mt-5 text-2xl font-600 uppercase tracking-wide text-[#1c1611]" style={{ fontWeight: 600 }}>{title}</h2>
      <p className="mt-2 max-w-sm text-sm text-[#6a635c]">{note}</p>
    </div>
  )
}

const AJUSTES_PLAN_LABELS = { prueba: 'Prueba', basico: 'Básico', pro: 'Premium', business: 'Business' }

// Sección "Mi plan" — diseño del prototipo: plan actual (zona caliente) + comparativa.
const PLAN_DEFS = {
  prueba: { name: 'Prueba', resumen: '14 días para probarlo todo.', maxRec: '5', maxU: 1, marca: true, plantillas: false, alerg: false, escand: false, inv: false },
  basico: { name: 'Básico', resumen: 'Lo esencial para tu cocina.', maxRec: '10/mes', maxU: 1, marca: false, plantillas: false, alerg: false, escand: false, inv: false },
  pro: { name: 'Premium', resumen: 'Multiusuario, plantillas y alérgenos.', maxRec: 'Ilimitadas', maxU: 8, marca: false, plantillas: true, alerg: true, escand: false, inv: false },
  business: { name: 'Business', resumen: 'Gestión completa del restaurante.', maxRec: 'Ilimitadas', maxU: 20, marca: false, plantillas: true, alerg: true, escand: true, inv: true },
}
const PLAN_ORDER = ['prueba', 'basico', 'pro', 'business']
const PLAN_ROWS = [
  ['Recetas', (p) => p.maxRec],
  ['Usuarios', (p) => String(p.maxU)],
  ['PDF sin marca de agua', (p) => (p.marca ? '—' : '✓')],
  ['Plantillas de diseño', (p) => (p.plantillas ? '4 diseños' : 'Básica')],
  ['Alérgenos (14 UE)', (p) => (p.alerg ? '✓' : '—')],
  ['Escandallo', (p) => (p.escand ? '✓' : '—')],
  ['Inventario y proveedores', (p) => (p.inv ? '✓' : '—')],
]

function PlanVal({ v }) {
  if (v === '✓') return <span className="text-ember">✓</span>
  if (v === '—') return <span className="text-ink-3">—</span>
  return <span className="data text-[13px] text-ink">{v}</span>
}

function PlanSection({ plan, onRequest }) {
  const cur = PLAN_DEFS[plan] || PLAN_DEFS.basico
  const usage = getUsage()
  const idx = PLAN_ORDER.indexOf(plan)
  const recetasUso = cur.maxRec === 'Ilimitadas'
    ? String(usage.recipes_total ?? 0)
    : `${usage.recipes_total ?? 0} / ${cur.maxRec}`
  const pdfUso = usage.pdf_exports_count != null ? String(usage.pdf_exports_count) : '—'

  return (
    <div className="pb-6">
      {/* Plan actual (zona caliente) */}
      <div className="hot-zone overflow-hidden rounded-2xl border border-white/10 shadow-[var(--shadow-forge)]">
        <div className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="pass-title text-[12px] tracking-[0.14em] text-cream-dim">Tu plan actual</p>
            <h2 className="pass-title mt-2 text-[34px] text-cream">{cur.name}</h2>
            <p className="mt-1 text-[14px] text-cream-dim">{cur.resumen}</p>
          </div>
          <div className="flex flex-col items-start gap-2 sm:items-end">
            {idx < PLAN_ORDER.length - 1 ? (
              <button onClick={onRequest} className="inline-flex h-11 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream shadow-[0_8px_20px_-8px_rgba(238,90,28,.7)] transition hover:bg-ember-hi">
                <Flame size={16} /> Solicitar mejora
              </button>
            ) : (
              <span className="text-[13px] text-ember-hi">Estás en el plan máximo.</span>
            )}
            <p className="text-[12px] text-cream-dim">El administrador activa el cambio.</p>
          </div>
        </div>
        <div className="grid grid-cols-3 divide-x divide-white/10 border-t border-white/10">
          {[['Recetas', recetasUso], ['Usuarios', `— / ${cur.maxU}`], ['PDF usados', pdfUso]].map(([k, v]) => (
            <div key={k} className="px-5 py-3.5">
              <p className="text-[11px] uppercase tracking-wide text-cream-dim">{k}</p>
              <p className="data mt-0.5 text-[18px] font-medium text-cream">{v}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Comparativa */}
      <h3 className="pass-title mb-4 mt-8 text-[20px] text-ink">Compara los planes</h3>
      <div className="steel-plate overflow-x-auto rounded-2xl">
        <table className="w-full min-w-[640px] border-collapse">
          <thead>
            <tr className="border-b border-steel-300">
              <th className="p-4 text-left" />
              {PLAN_ORDER.map((k) => {
                const actual = k === plan
                return (
                  <th key={k} className={`p-4 text-center ${actual ? 'bg-ember/8' : ''}`}>
                    <p className="pass-title text-[17px] text-ink">{PLAN_DEFS[k].name}</p>
                    {actual && <span className="mt-1 inline-block rounded-full bg-ember px-2 py-0.5 text-[10px] font-semibold uppercase text-cream">Actual</span>}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {PLAN_ROWS.map(([label, val]) => (
              <tr key={label} className="border-b border-steel-200 last:border-0">
                <td className="p-4 text-[13px] font-medium text-ink-2">{label}</td>
                {PLAN_ORDER.map((k) => (
                  <td key={k} className={`p-4 text-center ${k === plan ? 'bg-ember/8' : ''}`}><PlanVal v={val(PLAN_DEFS[k])} /></td>
                ))}
              </tr>
            ))}
            <tr>
              <td className="p-4" />
              {PLAN_ORDER.map((k) => (
                <td key={k} className={`p-4 text-center ${k === plan ? 'bg-ember/8' : ''}`}>
                  {k === plan ? (
                    <span className="text-[12px] text-ink-3">En uso</span>
                  ) : (
                    <button onClick={onRequest} className={`inline-flex h-9 items-center rounded-lg px-3 text-[13px] font-medium transition ${PLAN_ORDER.indexOf(k) > idx ? 'bg-ember text-cream hover:bg-ember-hi' : 'steel-plate text-ink hover:bg-white'}`}>
                      {PLAN_ORDER.indexOf(k) > idx ? 'Mejorar' : 'Cambiar'}
                    </button>
                  )}
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex items-start gap-2.5 rounded-xl bg-steel-200/60 p-4">
        <span className="mt-0.5 text-ember">✓</span>
        <p className="text-[13px] text-ink-2">
          Cambiar de plan <span className="font-medium text-ink">nunca borra tus datos</span>. Al bajar de plan se conservan todas las recetas; solo se ocultan las funciones no incluidas, que reaparecen al volver a subir.
        </p>
      </div>
    </div>
  )
}

// Sección "Usuarios y roles" — diseño del prototipo (pestañas Equipo / Roles).
const ROLES_DEF = [
  { id: 'owner', nombre: 'Owner', desc: 'Dueño del restaurante', flags: { view: 1, edit: 1, create: 1, delete: 1, escandallo: 1, users: 1 } },
  { id: 'manager', nombre: 'Manager', desc: 'Jefe de cocina', flags: { view: 1, edit: 1, create: 1, delete: 1, escandallo: 1, users: 0 } },
  { id: 'editor', nombre: 'Editor', desc: 'Edita fichas', flags: { view: 1, edit: 1, create: 0, delete: 0, escandallo: 0, users: 0 } },
  { id: 'viewer', nombre: 'Viewer', desc: 'Solo consulta', flags: { view: 1, edit: 0, create: 0, delete: 0, escandallo: 0, users: 0 } },
]
const ROLE_FLAGS = [
  ['view', 'Ver recetas'], ['edit', 'Editar'], ['create', 'Crear'],
  ['delete', 'Borrar'], ['escandallo', 'Ver escandallo'], ['users', 'Gestionar usuarios'],
]
const PLAN_MAX_USERS = { prueba: 1, basico: 1, pro: 8, business: 20 }

function RolFlag({ on }) {
  return on
    ? <span className="mx-auto grid h-6 w-6 place-items-center rounded-md bg-ember/12 text-ember">✓</span>
    : <span className="mx-auto block h-6 w-6 rounded-md border border-steel-200 bg-steel-100" />
}

function UsuariosSection({ username, role, title, plan }) {
  const [tab, setTab] = useState('equipo')
  const inicial = (username || '?').replace(/[_-]/g, ' ').trim().slice(0, 2).toUpperCase()
  const rolNombre = (ROLES_DEF.find((r) => r.id === role) || {}).nombre || role
  const maxU = PLAN_MAX_USERS[plan] || 1

  return (
    <div className="pb-6">
      {/* Pestañas */}
      <div className="mb-6 flex items-center justify-between">
        <div className="inline-flex rounded-lg steel-plate p-1">
          {[['equipo', 'Equipo'], ['roles', 'Roles y permisos']].map(([id, label]) => (
            <button key={id} onClick={() => setTab(id)} className={`h-9 rounded-md px-4 text-[13px] font-medium transition-colors ${tab === id ? 'bg-soot text-cream' : 'text-ink-2 hover:text-ink'}`}>
              {label}
            </button>
          ))}
        </div>
        {tab === 'equipo' && (
          <span className="inline-flex items-center gap-1.5 rounded-lg steel-plate px-3 py-2 text-[12px] text-ink-2">
            <Users size={15} className="text-ink-3" /> <span className="data">1/{maxU}</span> en uso
          </span>
        )}
      </div>

      {tab === 'equipo' ? (
        <>
          <div className="overflow-hidden rounded-2xl steel-plate">
            <div className="flex items-center gap-4 px-4 py-3.5 sm:px-5">
              <div className="grid h-11 w-11 flex-none place-items-center rounded-full bg-soot text-[13px] font-semibold text-cream">{inicial}</div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{username} <span className="text-[12px] font-normal text-ink-3">· tú</span></p>
                <p className="truncate text-[12px] text-ink-2">{title || rolNombre}</p>
              </div>
              <span className="hidden items-center rounded-full bg-ember/12 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-ember-deep sm:inline-flex">{rolNombre}</span>
            </div>
          </div>
          <p className="mt-4 text-[12px] text-ink-3">
            Invitar a más personas a tu cocina se activa muy pronto. Tu plan {AJUSTES_PLAN_LABELS[plan] || plan} permite hasta <span className="data">{maxU}</span> {maxU === 1 ? 'usuario' : 'usuarios'}.
          </p>
        </>
      ) : (
        <>
          <div className="overflow-x-auto rounded-2xl steel-plate">
            <table className="w-full min-w-[720px] border-collapse">
              <thead>
                <tr className="border-b border-steel-300">
                  <th className="p-4 text-left text-[12px] font-medium text-ink-2">Permiso</th>
                  {ROLES_DEF.map((r) => (
                    <th key={r.id} className="p-4 text-center">
                      <p className="pass-title text-[15px] text-ink">{r.nombre}</p>
                      <p className="text-[11px] font-normal text-ink-3">{r.desc}</p>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {ROLE_FLAGS.map(([k, label]) => (
                  <tr key={k} className="border-b border-steel-200 last:border-0">
                    <td className="p-4 text-[13px] text-ink">{label}</td>
                    {ROLES_DEF.map((r) => (
                      <td key={r.id} className="p-4"><RolFlag on={r.flags[k]} /></td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-4 text-[12px] text-ink-3">
            Los permisos de cada rol son editables por restaurante. El permiso efectivo también depende del plan contratado.
          </p>
        </>
      )}
    </div>
  )
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
  const [codePrefix, setCodePrefix] = useState(getRestaurantPrefix() || 'LT')
  const [freshAfterSave, setFreshAfterSave] = useState(null)

  // ── Sesión / rol ──
  const [authed, setAuthed] = useState(isAuthenticated())
  const [mustChange, setMustChange] = useState(mustChangePassword())
  const [role, setRole] = useState(getRole())
  const [view, setView] = useState('dashboard') // 'dashboard' | 'editor'
  const [section, setSection] = useState('recetas') // sección activa del shell (usuario normal)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(null)
  const [activeRestaurant, setActiveRestaurant] = useState({
    name: getRestaurantName(),
    logo: getRestaurantLogo(),
    defaultTemplate: getRestaurantDefaultTemplate() || 'formal',
  })
  const [sessionExpired, setSessionExpired] = useState(() => localStorage.getItem('rf_logout_reason') === 'idle')
  const username = getUsername()
  const restaurantName = getRestaurantName()
  const isSuperAdmin = role === 'superadmin'
  const canCreate = hasPerm('can_create_recipes')
  const canDelete = hasPerm('can_delete_recipes')
  const canEdit = hasPerm('can_edit_recipes')

  // Al arrancar con una sesión ya abierta, refresca rol/permisos/plan desde /me
  // (para que las sesiones previas al deploy obtengan los permisos nuevos).
  useEffect(() => {
    if (!isAuthenticated()) return
    refreshMe().then((data) => {
      if (!data) return
      setRole(data.role)
      setMustChange(mustChangePassword())
      setActiveRestaurant((prev) => ({
        name: data.restaurant_name ?? prev.name,
        logo: data.restaurant_logo ?? prev.logo,
        defaultTemplate: data.restaurant_default_template || prev.defaultTemplate,
      }))
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleLogout = () => {
    logout()
    localStorage.removeItem('rf_logout_reason')
    setAuthed(false)
    setRole(null)
    setView('dashboard')
    setSelectedRestaurantId(null)
    setSessionExpired(false)
  }

  // ── Navegación panel ↔ editor ──
  const openNewRecipe = (prefix) => {
    // OJO: al llamarse desde onClick={onNew} llega el evento del clic como
    // argumento; solo usamos `prefix` si es realmente un texto.
    const p = (typeof prefix === 'string' ? prefix : '') || getRestaurantPrefix() || codePrefix
    setCodePrefix(p)
    resetForm(p)
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
  // El super admin entra a un restaurante: guardamos su logo/plantilla para la ficha
  const selectRestaurant = (r) => {
    setSelectedRestaurantId(r.id)
    setActiveRestaurant({ name: r.name, logo: r.logo, defaultTemplate: r.default_template || 'formal' })
  }

  // ── Cierre de sesión por inactividad (15 min sin interacción) ──
  useEffect(() => {
    if (!authed) return
    const key = 'rf_last_activity'

    const forceLogout = () => {
      logout()
      localStorage.setItem('rf_logout_reason', 'idle')
      setAuthed(false)
      setRole(null)
      setView('dashboard')
      setSelectedRestaurantId(null)
      setSessionExpired(true)
    }

    // Si al (re)cargar ya se superó el límite (p.ej. recarga tras estar ausente)
    const last = Number(localStorage.getItem(key) || 0)
    if (last && Date.now() - last > IDLE_LIMIT_MS) {
      forceLogout()
      return
    }

    const mark = () => localStorage.setItem(key, String(Date.now()))
    mark()
    let lastMark = Date.now()
    const onActivity = () => {
      const now = Date.now()
      if (now - lastMark > 5000) {
        lastMark = now
        mark()
      }
    }
    const events = ['mousemove', 'mousedown', 'keydown', 'scroll', 'touchstart', 'click']
    events.forEach((e) => window.addEventListener(e, onActivity, { passive: true }))

    const interval = setInterval(() => {
      const l = Number(localStorage.getItem(key) || 0)
      if (l && Date.now() - l > IDLE_LIMIT_MS) forceLogout()
    }, 20000)

    return () => {
      events.forEach((e) => window.removeEventListener(e, onActivity))
      clearInterval(interval)
    }
  }, [authed])

  const exportRecipeId = new URL(window.location.href).searchParams.get('export')
  const isExportMode = Boolean(exportRecipeId)
  const [exportRecipe, setExportRecipe] = useState(null)
  const [exportLoading, setExportLoading] = useState(false)
  const [printScheduled, setPrintScheduled] = useState(false)

  const [form, setForm] = useState({ ...emptyForm })

  // Convierte el tiempo a minutos para calcular el total (admite decimales con coma)
  const toMinutes = (value, unit) => {
    const n = parseDecimal(value) || 0
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
    template: form.template || 'formal',
    accent_color: form.accent_color || '',
    category: form.category,
    description: form.description,
    servings: Number(form.servings || 1),
    yield_quantity: parseDecimal(form.yield_quantity),
    yield_unit: form.yield_unit || 'g',
    prep_time_value: parseDecimal(form.prep_time_value) ?? 0,
    prep_time_unit: form.prep_time_unit || 'min',
    cook_time_value: parseDecimal(form.cook_time_value) ?? 0,
    cook_time_unit: form.cook_time_unit || 'min',
    shelf_life_value: form.shelf_life_value ? Number(form.shelf_life_value) : null,
    shelf_life_unit: form.shelf_life_unit || 'dias',
    observations: form.observations,
    allergens: form.allergens || [],
    ingredients: form.ingredients
      .filter((item) => item.ingredient_name.trim())
      .map((item, index) => ({
        ...item,
        quantity: parseDecimal(item.quantity) ?? 0,
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

  const resetForm = (prefixOverride) => {
    // Si hay datos frescos del último guardado, usarlos para el siguiente código
    const list = freshAfterSave?.list ?? recipeList
    const prefix = prefixOverride ?? freshAfterSave?.prefix ?? codePrefix
    setSavedRecipeId(null)
    setEditingRecipeId(null)
    setFreshAfterSave(null)
    setPhotoFile(null)
    if (photoPreviewUrl) URL.revokeObjectURL(photoPreviewUrl)
    setPhotoPreviewUrl(null)
    setForm({
      ...emptyForm,
      code: prefix ? generateNextCode(prefix, list) : '',
      template: activeRestaurant.defaultTemplate || 'formal',
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

  // Al entrar a "Recetas" refrescamos la lista (p.ej. tras crear una receta
  // desde un escandallo, que se crea fuera de este flujo).
  useEffect(() => {
    if (authed && view === 'dashboard' && section === 'recetas') fetchRecipeList()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [section, view])

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
        template: data.template || 'formal',
        accent_color: data.accent_color || '',
        category: data.category || '',
        description: data.description || '',
        servings: data.servings || 1,
        yield_quantity: fmtDecimal(data.yield_quantity),
        yield_unit: data.yield_unit || 'g',
        prep_time_value: fmtDecimal(data.prep_time_value),
        prep_time_unit: data.prep_time_unit || 'min',
        cook_time_value: fmtDecimal(data.cook_time_value),
        cook_time_unit: data.cook_time_unit || 'min',
        shelf_life_value: data.shelf_life_value ?? '',
        shelf_life_unit: data.shelf_life_unit || 'dias',
        observations: data.observations || '',
        allergens: data.allergens || [],
        ingredients: data.ingredients?.length
          ? data.ingredients.map((ing) => ({
              group_name: ing.group_name || '',
              ingredient_name: ing.ingredient_name || '',
              quantity: fmtDecimal(ing.quantity),
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
      setActiveRestaurant((prev) => ({
        ...prev,
        name: data.restaurant_name || prev.name,
        logo: data.restaurant_logo || prev.logo,
      }))
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

  const downloadPDF = async (recipeId) => {
    // Registrar la exportación (aplica el tope de PDF del plan de prueba).
    try {
      const res = await authFetch(`${API_BASE}/recipes/register_pdf/`, { method: 'POST' })
      if (!res.ok) {
        const d = await res.json().catch(() => ({}))
        window.alert(d.reason || 'No puedes descargar más PDF con tu plan actual.')
        return
      }
    } catch {
      // Si el contador falla por red, no bloqueamos la descarga.
    }
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
          // Prefijo del restaurante del usuario; si no, se deduce de las recetas
          const detected = getRestaurantPrefix() || detectPrefix(data)
          setCodePrefix(detected)
          // Auto-rellenar el código en el formulario vacío inicial
          setForm((prev) => ({
            ...prev,
            code: prev.code || (detected ? generateNextCode(detected, data) : ''),
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
        const errorData = await response.json().catch(() => ({}))
        // Mensaje legible (p.ej. límite del plan: {"plan": ["..."]}).
        const first = errorData.plan ?? Object.values(errorData)[0]
        const readable = Array.isArray(first) ? first[0] : (typeof first === 'string' ? first : JSON.stringify(errorData))
        throw new Error(readable || `Error ${response.status}`)
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
        notice={sessionExpired ? 'Tu sesión se cerró por inactividad. Vuelve a iniciar sesión.' : ''}
        onSuccess={(data) => {
          localStorage.removeItem('rf_logout_reason')
          setAuthed(true)
          setMustChange(mustChangePassword())
          setRole(data.role)
          setView('dashboard')
          setSessionExpired(false)
        }}
      />
    )
  }

  // ── CONTRASEÑA TEMPORAL: obligar a definir una propia antes de entrar ──────
  if (mustChange) {
    return <ForcedPasswordScreen onDone={() => setMustChange(false)} onLogout={handleLogout} />
  }

  // ── MODO EXPORTACIÓN ──────────────────────────────────────────────────────
  if (isExportMode) {
    return (
      <div style={{ position: 'relative', margin: 0, padding: 0, background: 'white' }}>
        {exportLoading || !exportRecipe ? (
          <div style={{ padding: 40, textAlign: 'center' }}>
            Cargando ficha técnica para exportación...
          </div>
        ) : (
          <>
            {/* Si el plan no incluye plantillas personalizables, se exporta con
                la plantilla básica (sin perder la plantilla guardada). */}
            <RecipeSheetPreview recipe={feat('templates_custom') ? exportRecipe : { ...exportRecipe, template: 'formal', accent_color: '' }} />
            {feat('watermark') && (
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute', bottom: '7mm', right: '7mm', transform: 'rotate(-4deg)',
                  fontFamily: "'Oswald', system-ui, sans-serif", fontSize: '10.5px', fontWeight: 600,
                  textTransform: 'uppercase', letterSpacing: '0.06em', color: 'rgba(200,55,26,0.6)',
                  border: '1.5px solid rgba(200,55,26,0.5)', borderRadius: '6px', padding: '4px 9px',
                  WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact', pointerEvents: 'none',
                }}
              >
                Periodo de Prueba de: RecipeForge
              </div>
            )}
          </>
        )}
      </div>
    )
  }

  // ── DASHBOARD (pantalla de inicio tras login) ─────────────────────────────
  if (view === 'dashboard') {
    const connBanner = connectionError ? (
      <div className="mb-5 flex items-start gap-3 rounded-lg border-2 border-[#b03418]/30 bg-[#fbeae5] px-4 py-3">
        <span className="text-xl leading-none">⚠️</span>
        <div className="flex-1">
          <p className="text-sm font-semibold text-[#8f2c12]">Sin conexión con el servidor</p>
          <p className="mt-1 text-sm text-[#a4331a]">Tus recetas no se han perdido, solo no se pueden mostrar mientras el servidor esté apagado.</p>
          <button type="button" onClick={fetchRecipeList} className="mt-2 rounded-md border border-[#b03418]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#a4331a] hover:bg-[#f6d9d1]">Reintentar conexión</button>
        </div>
      </div>
    ) : null

    if (isSuperAdmin) {
      return (
        <>
          {connectionError && <div className="mx-auto max-w-6xl px-5 pt-4 md:px-8">{connBanner}</div>}
          <AdminDashboard
            username={username}
            recipes={recipeList}
            canDelete={canDelete}
            onLogout={handleLogout}
            selectedRestaurantId={selectedRestaurantId}
            onSelectRestaurant={selectRestaurant}
            onBackToRestaurants={() => setSelectedRestaurantId(null)}
            onOpenRecipe={openRecipe}
            onNewRecipe={openNewRecipe}
            onDeleteRecipe={deleteRecipe}
            onDownloadPDF={downloadPDF}
          />
        </>
      )
    }

    // ── Usuario de restaurante → plataforma unificada (shell + secciones) ──
    const canTeam = hasPerm('can_manage_users')
    const userSections = [
      { id: 'recetas', label: 'Recetas', icon: RecipeSheet },
      { id: 'escandallo', label: 'Escandallo', icon: Coins, locked: !feat('escandallo') },
      { id: 'alergenos', label: 'Alérgenos', icon: Allergen, locked: !feat('allergens') },
      { id: 'inventario', label: 'Inventario', icon: Inventory, locked: !feat('inventory') },
      { id: 'proveedores', label: 'Proveedores', icon: Truck, locked: !feat('suppliers') },
      ...(canTeam ? [{ id: 'equipo', label: 'Usuarios y roles', icon: Users, group: 'Gestión', locked: !feat('multiuser') }] : []),
      { id: 'plan', label: 'Mi plan', icon: Tag, group: 'Gestión' },
      // Ajustes disponible para todos los planes EXCEPTO la prueba de 14 días.
      ...(getPlan() !== 'prueba' ? [{ id: 'ajustes', label: 'Ajustes', icon: Gear, group: 'Gestión' }] : []),
    ]

    let sectionContent = null
    if (section === 'recetas') {
      sectionContent = (
        <Dashboard
          username={username} role={role} plan={getPlan()} restaurantName={restaurantName}
          recipes={recipeList} canCreate={canCreate} canDelete={canDelete}
          onNew={openNewRecipe} onEdit={openRecipe} onDelete={deleteRecipe}
          onDownloadPDF={downloadPDF} onLogout={handleLogout}
        />
      )
    } else if (section === 'escandallo') {
      sectionContent = feat('escandallo')
        ? <CosteoSection canEdit={canEdit} />
        : <LockedSection icon={Coins} title="Escandallo" requiredPlan="Business" points={['Coste real de materia prima', 'Formatos de compra, merma e IVA', 'Food cost y PVP al instante']} />
    } else if (section === 'alergenos') {
      sectionContent = feat('allergens')
        ? <AlergenosSection recipes={recipeList} />
        : <LockedSection icon={Allergen} title="Alérgenos" requiredPlan="Premium" points={['Los 14 alérgenos obligatorios de la UE', 'Etiquetado por ingrediente', 'Sello automático en la ficha']} />
    } else if (section === 'inventario') {
      sectionContent = feat('inventory')
        ? <InventarioSection canEdit={canEdit} />
        : <LockedSection icon={Inventory} title="Inventario" requiredPlan="Business" points={['Lo que tienes producido', 'Clasificado por partidas', 'Avisos de mínimos']} />
    } else if (section === 'proveedores') {
      sectionContent = feat('suppliers')
        ? <ProveedoresSection canEdit={canEdit} canCost={feat('escandallo') && hasPerm('can_view_escandallo')} />
        : <LockedSection icon={Truck} title="Proveedores" requiredPlan="Business" points={['Proveedores y contacto', 'Sus productos y precios', 'Alimenta el coste del escandallo']} />
    } else if (section === 'equipo') {
      sectionContent = feat('multiuser')
        ? <UsuariosSection username={username} role={role} title={getTitle()} plan={getPlan()} />
        : <LockedSection icon={Users} title="Usuarios y roles" requiredPlan="Premium" points={['Varios usuarios en tu cocina', 'Roles y permisos por persona', 'Modo consulta para cocineros']} />
    } else if (section === 'plan') {
      sectionContent = <PlanSection plan={getPlan()} onRequest={() => setShowUpgrade(true)} />
    } else if (section === 'ajustes') {
      sectionContent = <AjustesSection restaurantName={restaurantName} plan={getPlan()} role={role} />
    }

    return (
      <AppShell
        sections={userSections} active={section} onNavigate={setSection}
        username={username} role={role} plan={getPlan()} restaurantName={restaurantName} onLogout={handleLogout}
      >
        {connBanner}
        {sectionContent}
        <UpgradeModal open={showUpgrade} onClose={() => setShowUpgrade(false)} />
      </AppShell>
    )
  }

  // ── EDITOR (crear / editar ficha) ─────────────────────────────────────────
  return (
    <main className="rf-steel-surface min-h-screen w-full p-4 md:p-8">
      <section className="mx-auto max-w-[1680px] overflow-hidden rounded-2xl border border-[#b1b9c0] bg-white shadow-[0_18px_44px_-22px_rgba(20,16,8,0.55)]">
        {/* Barra superior: zona caliente */}
        <div className="rf-hot rf-grain rf-pass-edge relative flex flex-wrap items-center justify-between gap-3 px-5 py-3.5 md:px-7">
          <button
            type="button"
            onClick={backToDashboard}
            className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[.06] px-3.5 py-1.5 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/[.12]"
          >
            <ArrowLeft size={17} /> Volver al panel
          </button>
          <Logo variant="dark" className="hidden text-3xl drop-shadow-[0_2px_10px_rgba(232,83,31,0.4)] sm:inline-flex md:text-4xl" />
          <div className="flex items-center gap-3 text-sm">
            <span className="flex items-center gap-2 text-white/80">
              {username}
              <span className={`rf-cond rounded-full px-2 py-0.5 text-[11px] font-600 uppercase tracking-wide ${
                role === 'superadmin' || role === 'owner'
                  ? 'bg-[#e8531f]/22 text-[#ffbf9b]'
                  : role === 'manager'
                    ? 'bg-[#ff9a3d]/18 text-[#ffcf9e]'
                    : 'bg-white/12 text-white/85'
              }`} style={{ fontWeight: 600 }}>
                {ROLE_LABELS[role] || role}
              </span>
            </span>
            <button
              type="button"
              onClick={handleLogout}
              className="rounded-full border border-white/12 bg-white/[.06] px-3 py-1.5 text-xs font-medium text-white/85 backdrop-blur hover:bg-white/[.12]"
            >
              Cerrar sesión
            </button>
          </div>
        </div>

        <div className="p-5 md:p-8">
        {connectionError && (
          <div className="mb-5 flex items-start gap-3 rounded-lg border-2 border-[#b03418]/30 bg-[#fbeae5] px-4 py-3">
            <span className="text-xl leading-none">⚠️</span>
            <div className="flex-1">
              <p className="text-sm font-semibold text-[#8f2c12]">Sin conexión con el servidor</p>
              <p className="mt-1 text-sm text-[#a4331a]">
                No se pudo contactar con el backend en <code className="rf-mono rounded bg-[#f6d9d1] px-1 text-xs">{API_BASE}</code>.
                Asegúrate de que el servidor Django esté corriendo
                (<code className="rf-mono rounded bg-[#f6d9d1] px-1 text-xs">python manage.py runserver</code>).
                Tus recetas no se han perdido, solo no se pueden mostrar mientras el servidor esté apagado.
              </p>
              <button
                type="button"
                onClick={fetchRecipeList}
                className="mt-2 rounded-md border border-[#b03418]/30 bg-white px-3 py-1.5 text-xs font-medium text-[#a4331a] hover:bg-[#f6d9d1]"
              >
                Reintentar conexión
              </button>
            </div>
          </div>
        )}
        <h1 className="rf-cond text-3xl font-600 uppercase tracking-[0.04em] text-[#1c1611] md:text-4xl" style={{ fontWeight: 600 }}>
          {editingRecipeId ? `Editando · ${form.code}` : 'Nueva ficha técnica'}
        </h1>
        <p className="mt-2 text-[#6a635c]">
          {editingRecipeId
            ? `${form.name} — modifica los campos y guarda para actualizar la revisión automáticamente.`
            : 'Formulario dinámico para registrar receta, ingredientes y proceso de producción.'}
        </p>

        <div className="mt-8 grid grid-cols-1 gap-8 xl:grid-cols-2 xl:gap-10">
          <form className="rf-steel rf-edge min-w-0 space-y-8 rounded-3xl border border-[#c4ccd2] p-5 md:p-6" onSubmit={submitRecipe}>

            {/* ── INFO BÁSICA ── */}
            <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-2">
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
                    className="self-start text-xs font-medium text-[#b5420f] underline hover:text-[#8a3d15]"
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
                    type="text"
                    inputMode="decimal"
                    value={form.yield_quantity}
                    onChange={(e) => updateField('yield_quantity', e.target.value.replace(/[^\d.,]/g, ''))}
                    className="w-full min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2"
                    placeholder="0"
                  />
                  <select
                    value={form.yield_unit}
                    onChange={(e) => updateField('yield_unit', e.target.value)}
                    className="shrink-0 rounded-md border border-stone-300 px-2 py-2 bg-white"
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
                    type="text"
                    inputMode="decimal"
                    value={form.prep_time_value}
                    onChange={(e) => updateField('prep_time_value', e.target.value.replace(/[^\d.,]/g, ''))}
                    className="w-full min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2"
                    placeholder="0"
                  />
                  <select
                    value={form.prep_time_unit}
                    onChange={(e) => updateField('prep_time_unit', e.target.value)}
                    className="shrink-0 rounded-md border border-stone-300 px-2 py-2 bg-white"
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
                    type="text"
                    inputMode="decimal"
                    value={form.cook_time_value}
                    onChange={(e) => updateField('cook_time_value', e.target.value.replace(/[^\d.,]/g, ''))}
                    className="w-full min-w-0 flex-1 rounded-md border border-stone-300 px-3 py-2"
                    placeholder="0"
                  />
                  <select
                    value={form.cook_time_unit}
                    onChange={(e) => updateField('cook_time_unit', e.target.value)}
                    className="shrink-0 rounded-md border border-stone-300 px-2 py-2 bg-white"
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
                    className="shrink-0 rounded-md border border-stone-300 px-2 py-2 bg-white"
                  >
                    <option value="dias">Días</option>
                    <option value="meses">Meses</option>
                  </select>
                </div>
              </label>
              <div className="flex items-end rounded-md border border-dashed border-stone-300 px-3 py-2 text-sm text-stone-600">
                Tiempo total: {(() => {
                  const t = Math.round(totalTime)
                  if (t >= 60) {
                    const m = t % 60
                    return `${Math.floor(t / 60)}h ${m > 0 ? `${m}min` : ''}`.trim()
                  }
                  return `${t} min`
                })()}
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
                <h2 className="rf-cond text-xl font-600 uppercase tracking-wide text-[#1c1611]" style={{ fontWeight: 600 }}>Ingredientes</h2>
                <button
                  type="button"
                  onClick={addIngredient}
                  className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-1.5 text-sm font-medium text-[#3a352f] hover:bg-[#f1f3f4]"
                >
                  + Agregar insumo
                </button>
              </div>
              {form.ingredients.map((item, index) => (
                <div key={`ingredient-${index}`} className="grid gap-3 rounded-lg border border-stone-200 p-3 md:grid-cols-12">
                  <div className="md:col-span-2">
                    <select
                      className="w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm"
                      value={item.group_name || ''}
                      onChange={(e) => updateIngredient(index, 'group_name', e.target.value)}
                    >
                      <option value="">Grupo…</option>
                      {item.group_name && !INGREDIENT_GROUPS.includes(item.group_name) && (
                        <option value={item.group_name}>{item.group_name}</option>
                      )}
                      {INGREDIENT_GROUPS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm md:col-span-4"
                    placeholder="Insumo"
                    value={item.ingredient_name}
                    onChange={(e) => updateIngredient(index, 'ingredient_name', e.target.value)}
                  />
                  <input
                    type="text"
                    inputMode="decimal"
                    className="rounded-md border border-stone-300 px-3 py-2 text-sm md:col-span-2"
                    placeholder="Cantidad"
                    value={item.quantity}
                    onChange={(e) => updateIngredient(index, 'quantity', e.target.value.replace(/[^\d.,]/g, ''))}
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
                <h2 className="rf-cond text-xl font-600 uppercase tracking-wide text-[#1c1611]" style={{ fontWeight: 600 }}>Proceso paso a paso</h2>
                <button
                  type="button"
                  onClick={addStep}
                  className="rounded-lg border border-[#b9c0c6] bg-white px-3 py-1.5 text-sm font-medium text-[#3a352f] hover:bg-[#f1f3f4]"
                >
                  + Agregar paso
                </button>
              </div>
              {form.steps.map((item, index) => (
                <div key={`step-${index}`} className="space-y-3 rounded-lg border border-stone-200 p-3">
                  <div className="flex items-center justify-between">
                    <p className="rf-cond text-sm font-600 uppercase tracking-wide text-[#8a3d15]" style={{ fontWeight: 600 }}>Paso {index + 1}</p>
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

            {/* ── ALÉRGENOS (a nivel de ficha) ── */}
            {feat('allergens') && (
              <div className="flex flex-col gap-2">
                <p className="text-sm font-medium text-stone-700">Alérgenos <span className="font-normal text-stone-400">— selecciona los presentes en el plato (aparecen en la ficha)</span></p>
                <AllergenPicker
                  value={form.allergens || []}
                  onChange={(next) => updateField('allergens', next)}
                />
              </div>
            )}

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
              <p className="rounded-md border border-[#ff9a3d]/30 bg-[#fff3ea] px-3 py-2 text-sm text-[#8a3d15]">
                Tu rol solo permite <strong>ver y editar</strong> recetas existentes.
                Selecciona una ficha de la lista para editarla.
              </p>
            )}
            <div className="flex flex-wrap items-center gap-3">
              {(editingRecipeId || canCreate) && (
                <button
                  type="submit"
                  disabled={loading}
                  className="rf-ember-btn rf-cond rounded-lg px-5 py-2.5 text-sm font-600 uppercase tracking-wide text-white disabled:opacity-60"
                  style={{ fontWeight: 600 }}
                >
                  {loading ? 'Guardando...' : editingRecipeId ? 'Actualizar receta' : 'Guardar receta'}
                </button>
              )}
              {(editingRecipeId || canCreate) && (
                <button
                  type="button"
                  onClick={resetForm}
                  className={`rounded-lg border px-4 py-2.5 text-sm font-medium ${
                    savedRecipeId && !editingRecipeId
                      ? 'border-[#e8531f]/40 bg-[#fff3ea] text-[#b5420f] hover:bg-[#ffe7d6]'
                      : 'border-[#b9c0c6] bg-white text-[#3a352f] hover:bg-[#f1f3f4]'
                  }`}
                >
                  {editingRecipeId ? 'Cancelar edición' : savedRecipeId ? '+ Crear nueva receta' : 'Limpiar formulario'}
                </button>
              )}
              {savedRecipeId && feat('pdf') && (
                <button
                  type="button"
                  onClick={() => downloadPDF(savedRecipeId)}
                  className="flex items-center gap-1.5 rounded-lg border border-[#c4ccd2] bg-white px-4 py-2.5 text-sm font-medium text-[#3a352f] hover:bg-[#f1f3f4]"
                >
                  <Doc size={16} /> Descargar PDF
                </button>
              )}
            </div>
          </form>

          {/* ── PREVIEW ── */}
          <div className="min-w-0 space-y-4">
            <div className="rf-steel rf-edge rounded-3xl border border-[#c4ccd2] p-4">
              <p className="rf-cond flex items-center gap-2 text-xs font-600 uppercase tracking-[0.16em] text-[#7a736b]" style={{ fontWeight: 600 }}>
                <span className="rf-lamp-on inline-block h-1.5 w-1.5 rounded-full" /> Vista previa A4
              </p>
              {canCreate && feat('templates_custom') ? (
                <>
                  <p className="mt-1 text-sm text-[#6a635c]">Elige la plantilla de la ficha:</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
                    {TEMPLATES.map((t) => {
                      const active = (form.template || 'formal') === t.id
                      return (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => updateField('template', t.id)}
                          title={t.desc}
                          className={`rounded-xl border px-3 py-2 text-left text-xs transition ${
                            active
                              ? 'border-[#e8531f] bg-[#fff3ea] ring-2 ring-[#e8531f]/20'
                              : 'border-[#c4ccd2] bg-white hover:border-[#9aa2a9]'
                          }`}
                        >
                          <span className={`block font-semibold ${active ? 'text-[#b5420f]' : 'text-[#3a352f]'}`}>{t.label}</span>
                          <span className="mt-0.5 block leading-tight text-[#9a9188]">{t.desc}</span>
                        </button>
                      )
                    })}
                  </div>
                  {templateMeta(form.template).customizable && (
                    <div className="mt-3 flex items-center gap-3 rounded-lg border border-[#c4ccd2] bg-white px-3 py-2">
                      <label className="flex items-center gap-2 text-xs font-medium text-[#5a5650]">
                        Color de la plantilla
                        <input
                          type="color"
                          value={form.accent_color || templateMeta(form.template).defaultAccent}
                          onChange={(e) => updateField('accent_color', e.target.value)}
                          className="h-7 w-10 cursor-pointer rounded border border-stone-300 bg-white p-0.5"
                        />
                      </label>
                      {form.accent_color ? (
                        <button type="button" onClick={() => updateField('accent_color', '')} className="text-xs text-[#8a3d15] underline hover:text-[#5a5650]">
                          Restablecer al original
                        </button>
                      ) : (
                        <span className="text-xs text-[#9a9188]">Color por defecto</span>
                      )}
                    </div>
                  )}
                </>
              ) : (
                <p className="mt-1 text-sm text-[#6a635c]">
                  La ficha refleja el formulario en vivo, lista para impresión.
                </p>
              )}
            </div>
            <ScaledA4>
              <RecipeSheetPreview recipe={{
                ...form,
                template: feat('templates_custom') ? form.template : 'formal',
                accent_color: feat('templates_custom') ? form.accent_color : '',
                photoPreviewUrl, restaurant_name: activeRestaurant.name, restaurant_logo: activeRestaurant.logo,
              }} />
            </ScaledA4>
          </div>
        </div>

        {message && (
          <p className="rf-steel rf-edge mt-5 rounded-md border border-[#c4ccd2] px-3 py-2 text-sm text-[#5a5650]">
            {message}
          </p>
        )}
        </div>
      </section>
    </main>
  )
}

export default App

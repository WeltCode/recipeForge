// Llamadas al motor de escandallo (app backend `costeo`).
import { authFetch } from '../auth'
import { money } from './money'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

async function jsonOrThrow(res) {
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try {
      const data = await res.json()
      detail = data.detail || (Array.isArray(data) ? data[0] : Object.values(data)[0]) || detail
    } catch { /* sin cuerpo */ }
    throw new Error(Array.isArray(detail) ? detail[0] : String(detail))
  }
  return res.status === 204 ? null : res.json()
}
const j = (method, url, body) => authFetch(`${API_BASE}${url}`, {
  method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
  body: body ? JSON.stringify(body) : undefined,
}).then(jsonOrThrow)

// ── Insumos ──
export const listInsumos = () => j('GET', '/costeo/insumos/')
export const getInsumo = (id) => j('GET', `/costeo/insumos/${id}/`)
export const createInsumo = (b) => j('POST', '/costeo/insumos/', b)
export const updateInsumo = (id, b) => j('PATCH', `/costeo/insumos/${id}/`, b)
export const deleteInsumo = (id) => j('DELETE', `/costeo/insumos/${id}/`)

// ── Formatos de compra ──
export const createFormato = (b) => j('POST', '/costeo/formatos/', b)
export const updateFormato = (id, b) => j('PATCH', `/costeo/formatos/${id}/`, b)
export const deleteFormato = (id) => j('DELETE', `/costeo/formatos/${id}/`)
export const registerPrice = (id, b) => j('POST', `/costeo/formatos/${id}/register_price/`, b)
export const formatoHistory = (id) => j('GET', `/costeo/formatos/${id}/history/`)

// ── Escandallos ──
export const listEscandallos = (params = '') => j('GET', `/costeo/escandallos/${params}`)
export const getEscandallo = (id) => j('GET', `/costeo/escandallos/${id}/`)
export const createEscandallo = (b) => j('POST', '/costeo/escandallos/', b)
export const updateEscandallo = (id, b) => j('PATCH', `/costeo/escandallos/${id}/`, b)
export const deleteEscandallo = (id) => j('DELETE', `/costeo/escandallos/${id}/`)

// ── Preview (cálculo en vivo, sin persistir) ──
export const previewCosteo = (b) => j('POST', '/costeo/preview/', b)

// Unidad base del insumo (permite kg/l/pack además de la canónica).
export const INSUMO_BASE_UNITS = [['g', 'Gramo'], ['kg', 'Kilo'], ['ml', 'Mililitro'], ['l', 'Litro'], ['ud', 'Unidad'], ['pack', 'Pack']]
// Unidades que el usuario puede usar en una línea (se convierten con puentes).
export const USE_UNITS = [['g', 'g'], ['kg', 'kg'], ['ml', 'ml'], ['cl', 'cl'], ['l', 'l'], ['ud', 'ud'], ['pack', 'pack']]
// Unidad de peso para la merma (bruto/neto) del escandallo.
export const MERMA_UNITS = [['g', 'Gramo'], ['kg', 'Kilo'], ['ml', 'Mililitro'], ['l', 'Litro'], ['ud', 'Unidad'], ['pack', 'Pack']]

// "Precio por": cómo se compra el insumo. Mapea a los campos del formato.
// "presentacion" = se compra en unidades/envases que contienen una cantidad de
// peso/volumen (p. ej. 1 unidad = 5 L a 36 € → 7,20 €/L).
export const PRICE_PER = [
  ['kg', 'Kilo'], ['g', 'Gramo'], ['l', 'Litro'], ['ml', 'Mililitro'],
  ['pack', 'Pack / caja'], ['presentacion', 'Unidad / presentación'],
]
// Unidad de peso/volumen de una presentación (contenido de una unidad/envase).
export const PRESENTACION_UNITS = [
  ['ml', 'Mililitro'], ['l', 'Litro'], ['g', 'Gramo'], ['kg', 'Kilo'], ['ud', 'Unidad'],
]

// Construye {pack_levels, unit_size, unit_size_unit} desde la elección "precio por".
// - Directo (kg/g/l/ml): el precio es por 1 de esa unidad → contenido = 1 unidad.
// - Pack/caja: `packCount` unidades, cada una de `packSize` `packUnit`, por el
//   precio del pack → pack_levels=[packCount], unit_size=packSize (ej. 6×1 kg).
// - Presentación: 1 unidad/envase contiene `packSize` de `packUnit` por `precio`.
export function buildFormatContent({ pricePer, packSize, packUnit, packCount }) {
  if (pricePer === 'pack') {
    return { pack_levels: [Number(numTrim(packCount)) || 1], unit_size: packSize || '1', unit_size_unit: packUnit || 'kg' }
  }
  if (pricePer === 'presentacion') {
    return { pack_levels: [], unit_size: packSize || '1', unit_size_unit: packUnit || 'l' }
  }
  return { pack_levels: [], unit_size: '1', unit_size_unit: pricePer }
}

// Cantidad sin ceros sobrantes (5900.000 -> "5900"; 1.50 -> "1.5"). Punto decimal.
export const numTrim = (v) => {
  if (v == null || v === '') return ''
  const n = parseFloat(String(v).replace(',', '.'))
  return isNaN(n) ? String(v) : String(n)
}
// Dinero con 2 decimales.
// Importe con la moneda activa del restaurante (antes fijo en €). El nombre se
// mantiene por compatibilidad; internamente delega en money() de lib/money.
export const eur = (v) => money(v)
// Etiqueta de precio de un insumo/formato: "11.40 €/kg" (directo) o
// "6.40 €/ud · 440 g" (presentación, muestra el contenido del envase).
export function priceLabel(o) {
  if (!o || o.display_cost == null) return null
  const base = `${eur(o.display_cost)}/${o.display_unit}`
  return o.display_content ? `${base} · ${o.display_content}` : base
}
export function foodCostColor(pct) {
  if (pct == null) return 'text-ink-3'
  const n = Number(pct)
  if (n <= 30) return 'text-ok'
  if (n <= 40) return 'text-warn'
  return 'text-danger'
}

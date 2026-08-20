// Llamadas al motor de escandallo (app backend `costeo`).
import { authFetch } from '../auth'

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
export const PRICE_PER = [
  ['pack', 'Pack / caja'], ['kg', 'Kilo'], ['g', 'Gramo'], ['l', 'Litro'], ['ml', 'Mililitro'], ['ud', 'Unidad'],
]

// Construye {pack_levels, unit_size, unit_size_unit} desde la elección "precio por".
export function buildFormatContent({ pricePer, boxCount, packCount, packSize, packUnit }) {
  if (pricePer === 'pack') {
    const levels = []
    if (boxCount && Number(boxCount) > 0) levels.push(Number(boxCount))
    if (packCount && Number(packCount) > 0) levels.push(Number(packCount))
    return { pack_levels: levels, unit_size: packSize || '1', unit_size_unit: packUnit || 'l' }
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
export const eur = (v) => (v == null ? '—' : `${Number(v).toFixed(2)} €`)
export function foodCostColor(pct) {
  if (pct == null) return 'text-ink-3'
  const n = Number(pct)
  if (n <= 30) return 'text-ok'
  if (n <= 40) return 'text-warn'
  return 'text-danger'
}

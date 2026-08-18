// Llamadas al backend para catálogo, proveedores, inventario y escandallo.
import { authFetch } from '../auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

async function jsonOrThrow(res) {
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try {
      const data = await res.json()
      detail = data.detail || Object.values(data)[0] || detail
    } catch { /* respuesta sin cuerpo JSON */ }
    throw new Error(Array.isArray(detail) ? detail[0] : detail)
  }
  return res.status === 204 ? null : res.json()
}

// ── Proveedores ──
export const listSuppliers = () => authFetch(`${API_BASE}/suppliers/`).then(jsonOrThrow)
export const createSupplier = (body) =>
  authFetch(`${API_BASE}/suppliers/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOrThrow)
export const updateSupplier = (id, body) =>
  authFetch(`${API_BASE}/suppliers/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOrThrow)
export const deleteSupplier = (id) => authFetch(`${API_BASE}/suppliers/${id}/`, { method: 'DELETE' }).then(jsonOrThrow)

// ── Partidas de cocina ──
export const listPartidas = () => authFetch(`${API_BASE}/partidas/`).then(jsonOrThrow)
export const createPartida = (body) =>
  authFetch(`${API_BASE}/partidas/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOrThrow)
export const deletePartida = (id) => authFetch(`${API_BASE}/partidas/${id}/`, { method: 'DELETE' }).then(jsonOrThrow)

// ── Productos / inventario ──
export const listProducts = (params = '') => authFetch(`${API_BASE}/products/${params}`).then(jsonOrThrow)
export const createProduct = (body) =>
  authFetch(`${API_BASE}/products/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOrThrow)
export const updateProduct = (id, body) =>
  authFetch(`${API_BASE}/products/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOrThrow)
export const deleteProduct = (id) => authFetch(`${API_BASE}/products/${id}/`, { method: 'DELETE' }).then(jsonOrThrow)
export const adjustStock = (id, body) =>
  authFetch(`${API_BASE}/products/${id}/stock/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOrThrow)

// ── Escandallo (entidad propia) ──
export const listEscandallos = () => authFetch(`${API_BASE}/escandallos/`).then(jsonOrThrow)
export const getEscandallo = (id) => authFetch(`${API_BASE}/escandallos/${id}/`).then(jsonOrThrow)
export const createEscandallo = (body) =>
  authFetch(`${API_BASE}/escandallos/`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOrThrow)
export const updateEscandallo = (id, body) =>
  authFetch(`${API_BASE}/escandallos/${id}/`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(jsonOrThrow)
export const deleteEscandallo = (id) => authFetch(`${API_BASE}/escandallos/${id}/`, { method: 'DELETE' }).then(jsonOrThrow)
export const createRecipeFromEscandallo = (id) =>
  authFetch(`${API_BASE}/escandallos/${id}/create_recipe/`, { method: 'POST' }).then(jsonOrThrow)

// ── Recetas (para importar ingredientes en un escandallo) ──
export const listRecipes = () => authFetch(`${API_BASE}/recipes/`).then(jsonOrThrow)
export const getRecipe = (id) => authFetch(`${API_BASE}/recipes/${id}/`).then(jsonOrThrow)

export const UNIT_CHOICES = [
  ['kg', 'Kilogramo'], ['g', 'Gramo'], ['l', 'Litro'], ['ml', 'Mililitro'], ['ud', 'Unidad'],
]

// Cliente de la Fase 2: carta pública + especiales fuera de carta.
import QRCode from 'qrcode'
import { authFetch } from '../auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

// Opciones de clasificación de los especiales (coinciden con el backend).
export const TEMP_OPTS = [['', '—'], ['frio', 'Frío'], ['caliente_tierra', 'Caliente (tierra)'], ['caliente_mar', 'Caliente (mar)']]
export const CAT_OPTS = [['', '—'], ['entrante', 'Entrante'], ['plato_fuerte', 'Plato fuerte']]
export const FORMATO_OPTS = [['', '—'], ['individual', 'Individual'], ['compartir', 'Para compartir']]

async function jsonOrThrow(res) {
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try { const d = await res.json(); detail = Object.values(d).flat().join(' ') || detail } catch { /* sin cuerpo */ }
    throw new Error(detail)
  }
  return res.status === 204 ? null : res.json()
}

// ── Especiales (privado, owner/chef) ──
export async function listEspeciales() {
  return jsonOrThrow(await authFetch(`${API_BASE}/especiales/`))
}

// Envía como multipart si hay foto (File), si no JSON.
function especialBody(data) {
  if (data.photo instanceof File) {
    const fd = new FormData()
    Object.entries(data).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v) })
    return { body: fd }
  }
  const { photo, ...rest } = data  // eslint-disable-line no-unused-vars
  return { headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(rest) }
}

export async function createEspecial(data) {
  return jsonOrThrow(await authFetch(`${API_BASE}/especiales/`, { method: 'POST', ...especialBody(data) }))
}
export async function updateEspecial(id, data) {
  return jsonOrThrow(await authFetch(`${API_BASE}/especiales/${id}/`, { method: 'PATCH', ...especialBody(data) }))
}
export async function deleteEspecial(id) {
  return jsonOrThrow(await authFetch(`${API_BASE}/especiales/${id}/`, { method: 'DELETE' }))
}

// ── Carta (marcar platos + publicar) ──
export async function setRecipeMenu(id, fields) {
  // fields: { on_menu, menu_section, menu_price, menu_order, menu_description }
  return jsonOrThrow(await authFetch(`${API_BASE}/recipes/${id}/`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
  }))
}
// Sube una foto propia para el plato de la carta (distinta de la de la ficha).
export async function uploadMenuPhoto(id, file) {
  const fd = new FormData()
  fd.append('menu_photo', file)
  return jsonOrThrow(await authFetch(`${API_BASE}/recipes/${id}/`, { method: 'PATCH', body: fd }))
}

export async function setCartaPublishedApi(published) {
  return jsonOrThrow(await authFetch(`${API_BASE}/carta/settings/`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ carta_published: published }),
  }))
}

// ── Diseño de la carta (tema, fuente, colores, imagen de fondo) ──
export async function getCartaSettings() {
  return jsonOrThrow(await authFetch(`${API_BASE}/carta/settings/`))
}
export async function setCartaTheme(fields) {
  // Multipart si viene una imagen de fondo (File); si no, JSON.
  if (fields.carta_bg_image instanceof File) {
    const fd = new FormData()
    Object.entries(fields).forEach(([k, v]) => { if (v !== undefined && v !== null) fd.append(k, v) })
    return jsonOrThrow(await authFetch(`${API_BASE}/carta/settings/`, { method: 'PATCH', body: fd }))
  }
  return jsonOrThrow(await authFetch(`${API_BASE}/carta/settings/`, {
    method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(fields),
  }))
}
export const CARTA_THEMES = [
  { id: 'marea', name: 'Marea', desc: 'Oscuro elegante · fine dining' },
  { id: 'lienzo', name: 'Lienzo', desc: 'Bistró claro y cálido' },
  { id: 'carbon', name: 'Carbón', desc: 'Minimal alto contraste' },
]
export const CARTA_FONTS = [
  { id: '', name: 'La del diseño', stack: 'system-ui, sans-serif' },
  { id: 'serif', name: 'Serif elegante', stack: "'Bodoni Moda', Georgia, serif" },
  { id: 'sans', name: 'Sans moderna', stack: "'Jost', system-ui, sans-serif" },
  { id: 'mono', name: 'Mono técnica', stack: "'DM Mono', ui-monospace, monospace" },
  { id: 'script', name: 'Manuscrita', stack: "'Snell Roundhand', 'Brush Script MT', cursive" },
]

// ── Público (sin login) ──
export async function getPublicCarta(slug) {
  return jsonOrThrow(await fetch(`${API_BASE}/public/carta/${slug}/`))
}
export async function getPublicEspeciales(slug) {
  return jsonOrThrow(await fetch(`${API_BASE}/public/especiales/${slug}/`))
}

// Base pública CANÓNICA de las cartas. La gestión (y el QR) puede ejecutarse en
// app.recipeforge.es, pero la carta del comensal vive SIEMPRE en la raíz
// (recipeforge.es) → así los QR impresos no se rompen al mudar la app al
// subdominio. En dev cae al origin actual (localhost).
const PUBLIC_BASE = (import.meta.env.VITE_PUBLIC_BASE || window.location.origin).replace(/\/$/, '')

// URL pública de una carta/especiales por slug, desde la base canónica.
export function publicUrl(kind, slug) {
  return `${PUBLIC_BASE}/${kind}/${slug}`
}

// Genera un QR (data URL PNG) de una URL, para mostrar/descargar.
export function qrDataUrl(url, size = 320) {
  return QRCode.toDataURL(url, { width: size, margin: 2, errorCorrectionLevel: 'M' })
}

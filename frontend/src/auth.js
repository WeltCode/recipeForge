// Capa de autenticación: guarda el JWT, refresca el token y expone authFetch.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const KEYS = {
  access: 'rf_access',
  refresh: 'rf_refresh',
  role: 'rf_role',
  permissions: 'rf_permissions',
  features: 'rf_features',
  usage: 'rf_usage',
  plan: 'rf_plan',
  title: 'rf_title',
  username: 'rf_username',
  firstName: 'rf_first_name',
  avatar: 'rf_avatar',
  mustChange: 'rf_must_change',
  restaurant: 'rf_restaurant',
  restaurantName: 'rf_restaurant_name',
  restaurantPrefix: 'rf_restaurant_prefix',
  restaurantLogo: 'rf_restaurant_logo',
  restaurantDefaultTemplate: 'rf_restaurant_template',
  restaurantCurrency: 'rf_restaurant_currency',
  publicSlug: 'rf_public_slug',
  cartaPublished: 'rf_carta_published',
  restaurants: 'rf_restaurants',
  lastActivity: 'rf_last_activity',
}

// Minutos de inactividad tras los que se cierra la sesión automáticamente.
export const IDLE_LIMIT_MS = 15 * 60 * 1000

export function getAccess() {
  return localStorage.getItem(KEYS.access)
}
export function getRole() {
  return localStorage.getItem(KEYS.role)
}
export function getPermissions() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.permissions) || '{}')
  } catch {
    return {}
  }
}
export function hasPerm(flag) {
  return Boolean(getPermissions()[flag])
}
export function getFeatures() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.features) || '{}')
  } catch {
    return {}
  }
}
export function feat(name) {
  return Boolean(getFeatures()[name])
}
export function getUsage() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.usage) || '{}')
  } catch {
    return {}
  }
}
export function getPlan() {
  return localStorage.getItem(KEYS.plan)
}
export function getTitle() {
  return localStorage.getItem(KEYS.title)
}
export function getUsername() {
  return localStorage.getItem(KEYS.username)
}
export function getFirstName() {
  return localStorage.getItem(KEYS.firstName) || ''
}
export function getAvatar() {
  return localStorage.getItem(KEYS.avatar) || ''
}
export function mustChangePassword() {
  return localStorage.getItem(KEYS.mustChange) === '1'
}
export function setAvatar(url) {
  if (url) localStorage.setItem(KEYS.avatar, url)
  else localStorage.removeItem(KEYS.avatar)
}
export function getRestaurantId() {
  const v = localStorage.getItem(KEYS.restaurant)
  return v ? Number(v) : null
}
export function getRestaurantName() {
  return localStorage.getItem(KEYS.restaurantName)
}
export function getRestaurantPrefix() {
  return localStorage.getItem(KEYS.restaurantPrefix)
}
export function getRestaurantLogo() {
  return localStorage.getItem(KEYS.restaurantLogo)
}
export function getRestaurantDefaultTemplate() {
  return localStorage.getItem(KEYS.restaurantDefaultTemplate)
}
export function getCurrency() {
  return localStorage.getItem(KEYS.restaurantCurrency) || 'EUR'
}
export function setCurrency(code) {
  if (code) localStorage.setItem(KEYS.restaurantCurrency, code)
}
export function getPublicSlug() {
  return localStorage.getItem(KEYS.publicSlug) || ''
}
export function getCartaPublished() {
  return localStorage.getItem(KEYS.cartaPublished) === '1'
}
export function getRestaurants() {
  try {
    return JSON.parse(localStorage.getItem(KEYS.restaurants) || '[]')
  } catch {
    return []
  }
}
export function setCartaPublished(v) {
  localStorage.setItem(KEYS.cartaPublished, v ? '1' : '0')
}
export function isAuthenticated() {
  return Boolean(getAccess())
}

function storeSession({ access, refresh, role, permissions, features, usage, plan, title, username, first_name, avatar, must_change_password, restaurant, restaurant_name, restaurant_prefix, restaurant_logo, restaurant_default_template, restaurant_currency, restaurant_public_slug, restaurant_carta_published, restaurants }) {
  if (access) localStorage.setItem(KEYS.access, access)
  if (refresh) localStorage.setItem(KEYS.refresh, refresh)
  if (role) localStorage.setItem(KEYS.role, role)
  if (permissions) localStorage.setItem(KEYS.permissions, JSON.stringify(permissions))
  if (features) localStorage.setItem(KEYS.features, JSON.stringify(features))
  if (usage) localStorage.setItem(KEYS.usage, JSON.stringify(usage))
  if (plan) localStorage.setItem(KEYS.plan, plan)
  if (title != null) localStorage.setItem(KEYS.title, title)
  if (username) localStorage.setItem(KEYS.username, username)
  if (first_name != null) localStorage.setItem(KEYS.firstName, first_name)
  if (avatar != null) localStorage.setItem(KEYS.avatar, avatar || '')
  if (must_change_password != null) localStorage.setItem(KEYS.mustChange, must_change_password ? '1' : '0')
  if (restaurant != null) localStorage.setItem(KEYS.restaurant, String(restaurant))
  if (restaurant_name) localStorage.setItem(KEYS.restaurantName, restaurant_name)
  if (restaurant_currency) localStorage.setItem(KEYS.restaurantCurrency, restaurant_currency)
  if (restaurant_public_slug != null) localStorage.setItem(KEYS.publicSlug, restaurant_public_slug || '')
  if (restaurant_carta_published != null) localStorage.setItem(KEYS.cartaPublished, restaurant_carta_published ? '1' : '0')
  if (restaurant_prefix) localStorage.setItem(KEYS.restaurantPrefix, restaurant_prefix)
  // El logo se GUARDA aunque venga null (login/refreshMe traen siempre el campo):
  // así un restaurante sin logo NO hereda el del restaurante anterior en este navegador.
  if (restaurant_logo !== undefined) localStorage.setItem(KEYS.restaurantLogo, restaurant_logo || '')
  if (restaurant_default_template) localStorage.setItem(KEYS.restaurantDefaultTemplate, restaurant_default_template)
  if (restaurants != null) localStorage.setItem(KEYS.restaurants, JSON.stringify(restaurants))
}

export function clearSession() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
}

// Mapea un payload de login/verificación (contexto /me + tokens) a storeSession.
function _sessionFromLogin(data) {
  return {
    access: data.access,
    refresh: data.refresh,
    role: data.role,
    permissions: data.permissions,
    features: data.features,
    usage: data.usage,
    plan: data.restaurant_plan,
    title: data.title,
    username: data.username,
    first_name: data.first_name,
    avatar: data.avatar ?? '',
    must_change_password: data.must_change_password,
    restaurant: data.restaurant,
    restaurant_name: data.restaurant_name,
    restaurant_prefix: data.restaurant_prefix,
    restaurant_logo: data.restaurant_logo,
    restaurant_default_template: data.restaurant_default_template,
    restaurant_currency: data.restaurant_currency,
    restaurant_public_slug: data.restaurant_public_slug,
    restaurant_carta_published: data.restaurant_carta_published,
    restaurants: data.restaurants,
  }
}

export async function login(username, password) {
  let res
  try {
    res = await fetch(`${API_BASE}/auth/login/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    })
  } catch {
    throw new Error(`No se pudo conectar con el servidor (${API_BASE}).`)
  }
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    // DRF envuelve los valores en listas; los aplanamos.
    const flat = (v) => (Array.isArray(v) ? v[0] : v)
    if (flat(body.code) === 'email_not_verified') {
      const e = new Error(flat(body.detail) || 'Verifica tu correo antes de entrar.')
      e.code = 'email_not_verified'; e.email = flat(body.email)
      throw e
    }
    if (res.status === 401) throw new Error('Correo/usuario o contraseña incorrectos.')
    throw new Error(flat(body.detail) || `Error al iniciar sesión (${res.status}).`)
  }
  const data = await res.json()
  storeSession({
    access: data.access,
    refresh: data.refresh,
    role: data.role,
    permissions: data.permissions,
    features: data.features,
    usage: data.usage,
    plan: data.restaurant_plan,
    title: data.title,
    username: data.username,
    first_name: data.first_name,
    // Se guarda aunque venga null: así un usuario sin foto NO hereda la del
    // usuario anterior en este navegador (igual que el logo del restaurante).
    avatar: data.avatar ?? '',
    must_change_password: data.must_change_password,
    restaurant: data.restaurant,
    restaurant_name: data.restaurant_name,
    restaurant_prefix: data.restaurant_prefix,
    restaurant_logo: data.restaurant_logo,
    restaurant_default_template: data.restaurant_default_template,
    restaurant_currency: data.restaurant_currency,
    restaurant_public_slug: data.restaurant_public_slug,
    restaurant_carta_published: data.restaurant_carta_published,
    restaurants: data.restaurants,
  })
  return data
}

// Multi-local: cambia el restaurante activo del usuario. El servidor devuelve el
// contexto completo del local nuevo (rol/permisos/plan/features/moneda…), que se
// guarda tal cual. El llamador debe recargar la app para refrescar los datos.
export async function switchRestaurant(id) {
  const res = await authFetch(`${API_BASE}/auth/active-restaurant/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ restaurant: id }),
  })
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try { const d = await res.json(); detail = d.detail || Object.values(d).flat().join(' ') || detail } catch { /* sin cuerpo */ }
    throw new Error(detail)
  }
  const data = await res.json()
  storeSession({
    role: data.role,
    permissions: data.permissions,
    features: data.features,
    usage: data.usage,
    plan: data.restaurant_plan,
    title: data.title,
    restaurant: data.restaurant,
    restaurant_name: data.restaurant_name,
    restaurant_prefix: data.restaurant_prefix,
    restaurant_logo: data.restaurant_logo,
    restaurant_default_template: data.restaurant_default_template,
    restaurant_currency: data.restaurant_currency,
    restaurant_public_slug: data.restaurant_public_slug,
    restaurant_carta_published: data.restaurant_carta_published,
    restaurants: data.restaurants,
  })
  return data
}

// Alta autoservicio a la Prueba: crea restaurante + owner y autentica (guarda la
// sesión igual que login). Devuelve los datos de la cuenta nueva.
export async function signup({ restaurant_name, email, password, first_name, account_type }) {
  let res
  try {
    res = await fetch(`${API_BASE}/auth/signup/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ restaurant_name, email, password, first_name, account_type }),
    })
  } catch {
    throw new Error(`No se pudo conectar con el servidor (${API_BASE}).`)
  }
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    const detail = data.detail || Object.values(data).flat().join(' ') || `Error al crear la cuenta (${res.status}).`
    throw new Error(detail)
  }
  // El alta autoservicio exige verificar el correo: NO auto-inicia sesión.
  // (Si algún día se enviara sin verificación, vendría `access` y se guardaría.)
  if (data.access) storeSession(_sessionFromLogin(data))
  return data  // { verification_required, email }
}

// Verifica el correo con uid+token del enlace y deja la sesión iniciada.
export async function verifyEmail(uid, token) {
  const res = await fetch(`${API_BASE}/auth/verify-email/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ uid, token }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
  storeSession(_sessionFromLogin(data))
  return data
}

// Reenvía el correo de verificación. Responde siempre OK.
export async function resendVerification(email) {
  const res = await fetch(`${API_BASE}/auth/resend-verification/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
  return data.detail
}

// Solicita el enlace de restablecer contraseña. Responde siempre OK (no revela
// si el correo existe).
export async function requestPasswordReset(email) {
  const res = await fetch(`${API_BASE}/auth/password-reset/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data.detail || `Error ${res.status}`)
  return data.detail
}

// Multi-local (autoservicio del dueño Business): crea un LOCAL NUEVO ligado a mí
// como owner y lo deja como activo. El servidor devuelve el contexto completo.
export async function createLocal(name, currency) {
  const res = await authFetch(`${API_BASE}/auth/create-restaurant/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name, currency }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || Object.values(data).flat().join(' ') || `Error ${res.status}`)
  }
  storeSession({
    role: data.role,
    permissions: data.permissions,
    features: data.features,
    usage: data.usage,
    plan: data.restaurant_plan,
    title: data.title,
    restaurant: data.restaurant,
    restaurant_name: data.restaurant_name,
    restaurant_prefix: data.restaurant_prefix,
    restaurant_logo: data.restaurant_logo,
    restaurant_default_template: data.restaurant_default_template,
    restaurant_currency: data.restaurant_currency,
    restaurant_public_slug: data.restaurant_public_slug,
    restaurant_carta_published: data.restaurant_carta_published,
    restaurants: data.restaurants,
  })
  return data
}

// Multi-local: el dueño elimina UNO DE SUS locales (no el único). Devuelve el
// contexto del local restante; el llamador recarga la app.
export async function deleteLocal(id) {
  const res = await authFetch(`${API_BASE}/auth/my-restaurant/${id}/`, { method: 'DELETE' })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) {
    throw new Error(data.detail || Object.values(data).flat().join(' ') || `Error ${res.status}`)
  }
  storeSession({
    role: data.role,
    permissions: data.permissions,
    features: data.features,
    usage: data.usage,
    plan: data.restaurant_plan,
    title: data.title,
    restaurant: data.restaurant,
    restaurant_name: data.restaurant_name,
    restaurant_prefix: data.restaurant_prefix,
    restaurant_logo: data.restaurant_logo,
    restaurant_default_template: data.restaurant_default_template,
    restaurant_currency: data.restaurant_currency,
    restaurant_public_slug: data.restaurant_public_slug,
    restaurant_carta_published: data.restaurant_carta_published,
    restaurants: data.restaurants,
  })
  return data
}

// Cambia la contraseña del usuario autenticado. Al terminar, limpia el flag de
// cambio obligatorio en el cliente.
export async function changePassword(current_password, new_password) {
  const res = await authFetch(`${API_BASE}/auth/change-password/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ current_password, new_password }),
  })
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try { const d = await res.json(); detail = Object.values(d).flat().join(' ') || detail } catch { /* sin cuerpo */ }
    throw new Error(detail)
  }
  localStorage.setItem(KEYS.mustChange, '0')
  return res.json()
}

// Sube la foto de perfil (multipart) y guarda su URL en el cliente.
export async function uploadAvatar(file) {
  const fd = new FormData()
  fd.append('avatar', file, file.name || 'avatar.jpg')
  const res = await authFetch(`${API_BASE}/auth/avatar/`, { method: 'POST', body: fd })
  if (!res.ok) {
    let detail = `Error ${res.status}`
    try { const d = await res.json(); detail = Object.values(d).flat().join(' ') || detail } catch { /* sin cuerpo */ }
    throw new Error(detail)
  }
  const data = await res.json()
  setAvatar(data.avatar)
  return data.avatar
}
export async function deleteAvatar() {
  const res = await authFetch(`${API_BASE}/auth/avatar/`, { method: 'DELETE' })
  if (!res.ok) throw new Error(`Error ${res.status}`)
  setAvatar('')
  return null
}

export function logout() {
  clearSession()
}

// Refresca rol + permisos + plan + datos del restaurante desde /me.
// Se llama al arrancar la app para que las sesiones ya abiertas (antes de un
// deploy) obtengan los permisos nuevos sin tener que volver a iniciar sesión.
export async function refreshMe() {
  try {
    const res = await authFetch(`${API_BASE}/auth/me/`)
    if (!res.ok) return null
    const data = await res.json()
    storeSession({
      role: data.role,
      permissions: data.permissions,
      features: data.features,
      usage: data.usage,
      plan: data.restaurant_plan,
      title: data.title,
      username: data.username,
      first_name: data.first_name,
      avatar: data.avatar,
      must_change_password: data.must_change_password,
      restaurant: data.restaurant,
      restaurant_name: data.restaurant_name,
      restaurant_prefix: data.restaurant_prefix,
      restaurant_logo: data.restaurant_logo,
      restaurant_default_template: data.restaurant_default_template,
    restaurant_currency: data.restaurant_currency,
    restaurant_public_slug: data.restaurant_public_slug,
    restaurant_carta_published: data.restaurant_carta_published,
    restaurants: data.restaurants,
    })
    return data
  } catch {
    return null
  }
}

async function refreshAccess() {
  const refresh = localStorage.getItem(KEYS.refresh)
  if (!refresh) return null
  try {
    const res = await fetch(`${API_BASE}/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    })
    if (!res.ok) return null
    const data = await res.json()
    localStorage.setItem(KEYS.access, data.access)
    return data.access
  } catch {
    return null
  }
}

// fetch con el Bearer token. Si el access caduca (401), intenta refrescar una vez.
// Si el refresh también falla, cierra sesión y recarga (vuelve al login).
export async function authFetch(url, options = {}) {
  const makeReq = (token) => {
    const headers = new Headers(options.headers || {})
    if (token) headers.set('Authorization', `Bearer ${token}`)
    return fetch(url, { ...options, headers })
  }

  let res = await makeReq(getAccess())
  if (res.status === 401) {
    const newToken = await refreshAccess()
    if (newToken) {
      res = await makeReq(newToken)
    } else {
      clearSession()
      window.location.reload()
    }
  }
  return res
}

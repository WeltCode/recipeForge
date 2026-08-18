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
  restaurant: 'rf_restaurant',
  restaurantName: 'rf_restaurant_name',
  restaurantPrefix: 'rf_restaurant_prefix',
  restaurantLogo: 'rf_restaurant_logo',
  restaurantDefaultTemplate: 'rf_restaurant_template',
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
export function isAuthenticated() {
  return Boolean(getAccess())
}

function storeSession({ access, refresh, role, permissions, features, usage, plan, title, username, restaurant, restaurant_name, restaurant_prefix, restaurant_logo, restaurant_default_template }) {
  if (access) localStorage.setItem(KEYS.access, access)
  if (refresh) localStorage.setItem(KEYS.refresh, refresh)
  if (role) localStorage.setItem(KEYS.role, role)
  if (permissions) localStorage.setItem(KEYS.permissions, JSON.stringify(permissions))
  if (features) localStorage.setItem(KEYS.features, JSON.stringify(features))
  if (usage) localStorage.setItem(KEYS.usage, JSON.stringify(usage))
  if (plan) localStorage.setItem(KEYS.plan, plan)
  if (title != null) localStorage.setItem(KEYS.title, title)
  if (username) localStorage.setItem(KEYS.username, username)
  if (restaurant != null) localStorage.setItem(KEYS.restaurant, String(restaurant))
  if (restaurant_name) localStorage.setItem(KEYS.restaurantName, restaurant_name)
  if (restaurant_prefix) localStorage.setItem(KEYS.restaurantPrefix, restaurant_prefix)
  if (restaurant_logo) localStorage.setItem(KEYS.restaurantLogo, restaurant_logo)
  if (restaurant_default_template) localStorage.setItem(KEYS.restaurantDefaultTemplate, restaurant_default_template)
}

export function clearSession() {
  Object.values(KEYS).forEach((k) => localStorage.removeItem(k))
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
    if (res.status === 401) throw new Error('Usuario o contraseña incorrectos.')
    throw new Error(`Error al iniciar sesión (${res.status}).`)
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
    restaurant: data.restaurant,
    restaurant_name: data.restaurant_name,
    restaurant_prefix: data.restaurant_prefix,
    restaurant_logo: data.restaurant_logo,
    restaurant_default_template: data.restaurant_default_template,
  })
  return data
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
      restaurant: data.restaurant,
      restaurant_name: data.restaurant_name,
      restaurant_prefix: data.restaurant_prefix,
      restaurant_logo: data.restaurant_logo,
      restaurant_default_template: data.restaurant_default_template,
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

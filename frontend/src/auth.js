// Capa de autenticación: guarda el JWT, refresca el token y expone authFetch.
const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const KEYS = {
  access: 'rf_access',
  refresh: 'rf_refresh',
  role: 'rf_role',
  username: 'rf_username',
  restaurant: 'rf_restaurant',
  restaurantName: 'rf_restaurant_name',
  restaurantPrefix: 'rf_restaurant_prefix',
}

export function getAccess() {
  return localStorage.getItem(KEYS.access)
}
export function getRole() {
  return localStorage.getItem(KEYS.role)
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
export function isAuthenticated() {
  return Boolean(getAccess())
}

function storeSession({ access, refresh, role, username, restaurant, restaurant_name, restaurant_prefix }) {
  if (access) localStorage.setItem(KEYS.access, access)
  if (refresh) localStorage.setItem(KEYS.refresh, refresh)
  if (role) localStorage.setItem(KEYS.role, role)
  if (username) localStorage.setItem(KEYS.username, username)
  if (restaurant != null) localStorage.setItem(KEYS.restaurant, String(restaurant))
  if (restaurant_name) localStorage.setItem(KEYS.restaurantName, restaurant_name)
  if (restaurant_prefix) localStorage.setItem(KEYS.restaurantPrefix, restaurant_prefix)
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
    username: data.username,
    restaurant: data.restaurant,
    restaurant_name: data.restaurant_name,
    restaurant_prefix: data.restaurant_prefix,
  })
  return data
}

export function logout() {
  clearSession()
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

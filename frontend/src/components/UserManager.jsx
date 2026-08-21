import { useEffect, useState } from 'react'
import { authFetch } from '../auth'
import { Trash, Plus, User, Lock, X } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const ROLE_LABELS = { owner: 'Owner', manager: 'Manager', editor: 'Editor', viewer: 'Viewer' }
const ROLE_HELP = {
  owner: 'Dueño: todo + gestión',
  manager: 'Chef: crear/editar/borrar + coste',
  editor: 'Jefe de partida: editar (sin crear/borrar)',
  viewer: 'Cocinero: solo consulta',
}

// Panel de usuarios. Dos modos:
//  - restaurantId: usuarios (owner/manager/editor/viewer) de un restaurante. Se
//    identifican con su CORREO; la contraseña se genera temporal y el usuario la
//    cambia al entrar.
//  - admins: super administradores de la plataforma (usuario + contraseña).
function UserManager({ restaurantId, admins = false }) {
  const emptyNewUser = admins
    ? { username: '', password: '', role: 'superadmin' }
    : { first_name: '', last_name: '', email: '', phone: '', role: 'viewer', title: '' }
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ ...emptyNewUser })
  const [message, setMessage] = useState('')
  const [tempCred, setTempCred] = useState(null) // { login, password } tras crear/restablecer
  const [loading, setLoading] = useState(false)

  const listUrl = admins
    ? `${API_BASE}/users/?role=superadmin`
    : `${API_BASE}/users/?restaurant=${restaurantId}`

  const loadUsers = async () => {
    try {
      const res = await authFetch(listUrl)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setUsers(await res.json())
    } catch (err) {
      setMessage(`No se pudieron cargar los usuarios: ${err.message}`)
    }
  }

  useEffect(() => {
    if (admins || restaurantId) loadUsers()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId, admins])

  const createUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    setTempCred(null)
    try {
      const body = admins
        ? { username: newUser.username, password: newUser.password, role: 'superadmin' }
        : { ...newUser, restaurant: restaurantId }
      const res = await authFetch(`${API_BASE}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data).flat().join(' '))
      const login = admins ? newUser.username : newUser.email
      setMessage(`Usuario "${login}" creado.`)
      if (data.generated_password) setTempCred({ login, password: data.generated_password })
      setNewUser({ ...emptyNewUser })
      loadUsers()
    } catch (err) {
      setMessage(`No se pudo crear: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const patchUser = async (id, payload) => {
    try {
      const res = await authFetch(`${API_BASE}/users/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(Object.values(await res.json()).flat().join(' '))
      loadUsers()
    } catch (err) {
      setMessage(`No se pudo actualizar: ${err.message}`)
    }
  }

  const resetPassword = async (id, login) => {
    if (!window.confirm(`¿Generar una contraseña temporal nueva para "${login}"? La actual dejará de funcionar.`)) return
    setTempCred(null)
    try {
      const res = await authFetch(`${API_BASE}/users/${id}/reset_password/`, { method: 'POST' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data).flat().join(' '))
      setMessage(`Contraseña de "${login}" restablecida.`)
      if (data.generated_password) setTempCred({ login, password: data.generated_password })
    } catch (err) {
      setMessage(`No se pudo restablecer: ${err.message}`)
    }
  }

  const deleteUser = async (id, login) => {
    if (!window.confirm(`¿Eliminar al usuario "${login}"?`)) return
    try {
      const res = await authFetch(`${API_BASE}/users/${id}/`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setMessage(`Usuario "${login}" eliminado.`)
      loadUsers()
    } catch (err) {
      setMessage(`No se pudo eliminar: ${err.message}`)
    }
  }

  const inputCls = 'rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 text-sm focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20'

  return (
    <div className="space-y-4">
      {/* Crear usuario */}
      <form onSubmit={createUser} className="rf-steel rf-edge rounded-xl border border-[#c4ccd2] p-4">
        {admins ? (
          <div className="grid gap-3 sm:grid-cols-3">
            <input required value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })} className={inputCls} placeholder="Usuario" autoComplete="off" />
            <input required type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className={inputCls} placeholder="Contraseña" autoComplete="new-password" />
            <button type="submit" disabled={loading} className="rf-cell rf-cond flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm uppercase tracking-wide text-white transition hover:bg-[#241a14] disabled:opacity-60" style={{ fontWeight: 600 }}>
              <Plus size={16} /> {loading ? 'Creando…' : 'Añadir admin'}
            </button>
          </div>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              <label className="flex flex-col gap-1 text-[12px] text-[#6a635c]">Nombre *
                <input required value={newUser.first_name} onChange={(e) => setNewUser({ ...newUser, first_name: e.target.value })} className={inputCls} autoComplete="off" /></label>
              <label className="flex flex-col gap-1 text-[12px] text-[#6a635c]">Apellido
                <input value={newUser.last_name} onChange={(e) => setNewUser({ ...newUser, last_name: e.target.value })} className={inputCls} autoComplete="off" /></label>
              <label className="flex flex-col gap-1 text-[12px] text-[#6a635c]">Correo *
                <input required type="email" value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} className={inputCls} placeholder="tu@correo.com" autoComplete="off" /></label>
              <label className="flex flex-col gap-1 text-[12px] text-[#6a635c]">Teléfono *
                <input required value={newUser.phone} onChange={(e) => setNewUser({ ...newUser, phone: e.target.value })} className={inputCls} autoComplete="off" /></label>
              <label className="flex flex-col gap-1 text-[12px] text-[#6a635c]">Rol *
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className={`${inputCls} bg-white`} title={ROLE_HELP[newUser.role]}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
              <label className="flex flex-col gap-1 text-[12px] text-[#6a635c]">Cargo (opcional)
                <input value={newUser.title} onChange={(e) => setNewUser({ ...newUser, title: e.target.value })} className={inputCls} placeholder="ej. Sous chef" autoComplete="off" /></label>
            </div>
            <div className="mt-3 flex items-center justify-between gap-3">
              <p className="text-[12px] text-[#8a837b]">Se generará una contraseña temporal que el usuario cambiará al entrar.</p>
              <button type="submit" disabled={loading} className="rf-cell rf-cond flex shrink-0 items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm uppercase tracking-wide text-white transition hover:bg-[#241a14] disabled:opacity-60" style={{ fontWeight: 600 }}>
                <Plus size={16} /> {loading ? 'Creando…' : 'Añadir usuario'}
              </button>
            </div>
          </>
        )}
      </form>

      {/* Contraseña temporal generada (mostrar una vez, para compartir) */}
      {tempCred && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-[#e8531f]/30 bg-[#fff3ea] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-[#8a3d15]">Contraseña temporal de «{tempCred.login}»</p>
            <p className="mt-1 text-[13px] text-[#5a5650]">Compártela con el usuario. Deberá cambiarla al iniciar sesión.</p>
            <p className="data mt-1.5 select-all rounded-md bg-white px-2.5 py-1 text-[14px] font-medium text-[#1c1611]">{tempCred.password}</p>
          </div>
          <button onClick={() => setTempCred(null)} className="shrink-0 text-[#9a9188] hover:text-[#5a5650]"><X size={16} /></button>
        </div>
      )}

      {/* Lista */}
      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#c4ccd2] px-4 py-6 text-center text-sm text-[#9a9188]">
          {admins ? 'Aún no hay administradores.' : 'Este restaurante aún no tiene usuarios.'}
        </p>
      ) : (
        <div className="divide-y divide-[#d5dade] overflow-hidden rounded-xl border border-[#c4ccd2]">
          {users.map((u) => {
            const login = u.email || u.username
            const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ')
            return (
              <div key={u.id} className="flex flex-col gap-3 bg-white/50 px-4 py-3 transition hover:bg-[#fff3ea]/60 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="flex items-center gap-2 font-medium text-[#1c1611]">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-white"><User size={15} /></span>
                    {fullName || login}
                  </span>
                  {fullName && <span className="text-xs text-[#8a837b]">{login}</span>}
                  {admins ? (
                    <span className="rf-cond inline-flex items-center rounded-full bg-[#e8531f]/12 px-2.5 py-0.5 text-xs uppercase tracking-wide text-[#b5420f]" style={{ fontWeight: 600 }}>Super Admin</span>
                  ) : (
                    <div className="flex items-center gap-2">
                      <select value={u.role || 'viewer'} onChange={(e) => patchUser(u.id, { role: e.target.value })} className="rounded-md border border-[#b9c0c6] bg-white px-2 py-1 text-xs" title={ROLE_HELP[u.role]}>
                        {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                      </select>
                      {u.title && <span className="text-xs text-[#8a3d15]">· {u.title}</span>}
                      {u.must_change_password && <span className="rounded-full bg-[#f0e3c9] px-2 py-0.5 text-[10px] font-medium text-[#8a6a1f]">contraseña temporal</span>}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <button onClick={() => resetPassword(u.id, login)} title="Restablecer contraseña"
                    className="flex items-center gap-1 rounded-lg border border-[#c4ccd2] bg-white px-2 py-1.5 text-xs text-[#5a5650] hover:bg-[#f1f3f4]"><Lock size={14} /> Restablecer</button>
                  <button onClick={() => deleteUser(u.id, login)} title="Eliminar"
                    className="rounded-lg border border-[#b03418]/25 bg-[#fbeae5] px-2 py-1.5 text-[#a4331a] hover:bg-[#f6d9d1]"><Trash size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {message && <p className="rounded-lg border border-[#c4ccd2] bg-white/60 px-3 py-2 text-sm text-[#5a5650]">{message}</p>}
    </div>
  )
}

export default UserManager

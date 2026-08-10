import { useEffect, useState } from 'react'
import { authFetch } from '../auth'
import { Trash, Plus, User, Pencil, X } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const ROLE_LABELS = { basic: 'Básico', premium: 'Premium' }

// Panel de usuarios. Dos modos:
//  - restaurantId: usuarios (básico/premium) de un restaurante.
//  - admins: super administradores de la plataforma (sin restaurante).
function UserManager({ restaurantId, admins = false }) {
  const emptyNewUser = { username: '', password: '', role: admins ? 'superadmin' : 'basic' }
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ ...emptyNewUser })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editPass, setEditPass] = useState('')

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
  }, [restaurantId, admins])

  const createUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const body = admins
        ? { username: newUser.username, password: newUser.password, role: 'superadmin' }
        : { ...newUser, restaurant: restaurantId }
      const res = await authFetch(`${API_BASE}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (!res.ok) throw new Error(Object.values(await res.json()).flat().join(' '))
      setNewUser({ ...emptyNewUser })
      setMessage(`Usuario "${newUser.username}" creado.`)
      loadUsers()
    } catch (err) {
      setMessage(`No se pudo crear: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const patchUser = async (id, payload, okMsg) => {
    try {
      const res = await authFetch(`${API_BASE}/users/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      if (!res.ok) throw new Error(Object.values(await res.json()).flat().join(' '))
      if (okMsg) setMessage(okMsg)
      loadUsers()
    } catch (err) {
      setMessage(`No se pudo actualizar: ${err.message}`)
    }
  }

  const savePassword = async (id, username) => {
    if (!editPass.trim()) return
    await patchUser(id, { password: editPass }, `Contraseña de "${username}" actualizada.`)
    setEditingId(null)
    setEditPass('')
  }

  const deleteUser = async (id, username) => {
    if (!window.confirm(`¿Eliminar al usuario "${username}"?`)) return
    try {
      const res = await authFetch(`${API_BASE}/users/${id}/`, { method: 'DELETE' })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setMessage(`Usuario "${username}" eliminado.`)
      loadUsers()
    } catch (err) {
      setMessage(`No se pudo eliminar: ${err.message}`)
    }
  }

  const inputCls = 'rounded-lg border border-[#b9c0c6] bg-white px-3 py-2 text-sm focus:border-[#e8531f] focus:outline-none focus:ring-2 focus:ring-[#e8531f]/20'

  return (
    <div className="space-y-4">
      {/* Crear usuario */}
      <form onSubmit={createUser} className={`rf-steel rf-edge grid gap-3 rounded-xl border border-[#c4ccd2] p-4 ${admins ? 'sm:grid-cols-3' : 'md:grid-cols-4'}`}>
        <input required value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          className={inputCls} placeholder="Usuario" autoComplete="off" />
        <input required type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          className={inputCls} placeholder="Contraseña" autoComplete="new-password" />
        {!admins && (
          <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className={`${inputCls} bg-white`}>
            <option value="basic">Básico (ver y editar)</option>
            <option value="premium">Premium (crear, editar, eliminar)</option>
          </select>
        )}
        <button type="submit" disabled={loading}
          className="rf-cell rf-cond flex items-center justify-center gap-1.5 rounded-lg px-4 py-2 text-sm font-600 uppercase tracking-wide text-white transition hover:bg-[#241a14] disabled:opacity-60" style={{ fontWeight: 600 }}>
          <Plus size={16} /> {loading ? 'Creando…' : admins ? 'Añadir admin' : 'Añadir usuario'}
        </button>
      </form>

      {/* Lista */}
      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-[#c4ccd2] px-4 py-6 text-center text-sm text-[#9a9188]">
          {admins ? 'Aún no hay administradores.' : 'Este restaurante aún no tiene usuarios.'}
        </p>
      ) : (
        <div className="divide-y divide-[#d5dade] overflow-hidden rounded-xl border border-[#c4ccd2]">
          {users.map((u) => (
            <div key={u.id} className="flex flex-col gap-3 bg-white/50 px-4 py-3 transition hover:bg-[#fff3ea]/60 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="flex items-center gap-2 font-medium text-[#1c1611]">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-white"><User size={15} /></span>
                  {u.username}
                </span>
                {admins ? (
                  <span className="rf-cond inline-flex items-center rounded-full bg-[#e8531f]/12 px-2.5 py-0.5 text-xs font-600 uppercase tracking-wide text-[#b5420f]" style={{ fontWeight: 600 }}>Super Admin</span>
                ) : (
                  <select value={u.role} onChange={(e) => patchUser(u.id, { role: e.target.value })}
                    className="rounded-md border border-[#b9c0c6] bg-white px-2 py-1 text-xs">
                    {Object.entries(ROLE_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>{label}</option>
                    ))}
                  </select>
                )}
              </div>
              {editingId === u.id ? (
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <input type="password" autoFocus value={editPass} onChange={(e) => setEditPass(e.target.value)}
                    className="w-full min-w-0 flex-1 rounded-md border border-[#b9c0c6] px-2 py-1 text-xs sm:w-36 sm:flex-none" placeholder="Nueva contraseña" />
                  <button onClick={() => savePassword(u.id, u.username)} className="rf-cell shrink-0 rounded-md px-2 py-1 text-xs font-medium text-white">Guardar</button>
                  <button onClick={() => { setEditingId(null); setEditPass('') }} className="shrink-0 rounded-md border border-[#b9c0c6] px-1.5 py-1 text-[#7a736b]"><X size={14} /></button>
                </div>
              ) : (
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <button onClick={() => { setEditingId(u.id); setEditPass('') }} title="Cambiar contraseña"
                    className="flex items-center gap-1 rounded-lg border border-[#c4ccd2] bg-white px-2 py-1.5 text-xs text-[#5a5650] hover:bg-[#f1f3f4]"><Pencil size={14} /> Contraseña</button>
                  <button onClick={() => deleteUser(u.id, u.username)} title="Eliminar"
                    className="rounded-lg border border-[#b03418]/25 bg-[#fbeae5] px-2 py-1.5 text-[#a4331a] hover:bg-[#f6d9d1]"><Trash size={15} /></button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {message && <p className="rounded-lg border border-[#c4ccd2] bg-white/60 px-3 py-2 text-sm text-[#5a5650]">{message}</p>}
    </div>
  )
}

export default UserManager

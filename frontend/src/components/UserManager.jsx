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

  return (
    <div className="space-y-4">
      {/* Crear usuario */}
      <form onSubmit={createUser} className={`grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 ${admins ? 'sm:grid-cols-3' : 'md:grid-cols-4'}`}>
        <input required value={newUser.username} onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none" placeholder="Usuario" autoComplete="off" />
        <input required type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm focus:border-orange-400 focus:outline-none" placeholder="Contraseña" autoComplete="new-password" />
        {!admins && (
          <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
            className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm focus:border-orange-400 focus:outline-none">
            <option value="basic">Básico (ver y editar)</option>
            <option value="premium">Premium (crear, editar, eliminar)</option>
          </select>
        )}
        <button type="submit" disabled={loading}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60">
          <Plus size={16} /> {loading ? 'Creando…' : admins ? 'Añadir admin' : 'Añadir usuario'}
        </button>
      </form>

      {/* Lista */}
      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
          {admins ? 'Aún no hay administradores.' : 'Este restaurante aún no tiene usuarios.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium text-stone-900">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-stone-600"><User size={15} /></span>
                      {u.username}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {admins ? (
                      <span className="inline-flex items-center rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-medium text-indigo-700">Super Admin</span>
                    ) : (
                      <select value={u.role} onChange={(e) => patchUser(u.id, { role: e.target.value })}
                        className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs">
                        {Object.entries(ROLE_LABELS).map(([value, label]) => (
                          <option key={value} value={value}>{label}</option>
                        ))}
                      </select>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {editingId === u.id ? (
                      <div className="flex items-center justify-end gap-1.5">
                        <input type="password" autoFocus value={editPass} onChange={(e) => setEditPass(e.target.value)}
                          className="w-36 rounded-md border border-stone-300 px-2 py-1 text-xs" placeholder="Nueva contraseña" />
                        <button onClick={() => savePassword(u.id, u.username)} className="rounded-md bg-stone-900 px-2 py-1 text-xs font-medium text-white">Guardar</button>
                        <button onClick={() => { setEditingId(null); setEditPass('') }} className="rounded-md border border-stone-300 px-1.5 py-1 text-stone-500"><X size={14} /></button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-end gap-1.5">
                        <button onClick={() => { setEditingId(u.id); setEditPass('') }} title="Cambiar contraseña"
                          className="flex items-center gap-1 rounded-lg border border-stone-200 bg-white px-2 py-1.5 text-xs text-stone-600 hover:bg-stone-100"><Pencil size={14} /> Contraseña</button>
                        <button onClick={() => deleteUser(u.id, u.username)} title="Eliminar"
                          className="rounded-lg border border-red-200 bg-red-50 px-2 py-1.5 text-red-600 hover:bg-red-100"><Trash size={15} /></button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message && <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">{message}</p>}
    </div>
  )
}

export default UserManager

import { useEffect, useState } from 'react'
import { authFetch } from '../auth'
import { Trash, Plus, User } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const ROLE_LABELS = { basic: 'Básico', premium: 'Premium' }

const emptyNewUser = { username: '', password: '', role: 'basic' }

// Panel de usuarios de UN restaurante (embebido en el detalle del restaurante).
function UserManager({ restaurantId }) {
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ ...emptyNewUser })
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const loadUsers = async () => {
    try {
      const res = await authFetch(`${API_BASE}/users/?restaurant=${restaurantId}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setUsers(await res.json())
    } catch (err) {
      setMessage(`No se pudieron cargar los usuarios: ${err.message}`)
    }
  }

  useEffect(() => {
    if (restaurantId) loadUsers()
  }, [restaurantId])

  const createUser = async (e) => {
    e.preventDefault()
    setLoading(true)
    setMessage('')
    try {
      const res = await authFetch(`${API_BASE}/users/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newUser, restaurant: restaurantId }),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(JSON.stringify(err))
      }
      setNewUser({ ...emptyNewUser })
      setMessage(`Usuario "${newUser.username}" creado.`)
      loadUsers()
    } catch (err) {
      setMessage(`No se pudo crear el usuario: ${err.message}`)
    } finally {
      setLoading(false)
    }
  }

  const changeRole = async (id, role) => {
    try {
      const res = await authFetch(`${API_BASE}/users/${id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      loadUsers()
    } catch (err) {
      setMessage(`No se pudo cambiar el rol: ${err.message}`)
    }
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
      <form onSubmit={createUser} className="grid gap-3 rounded-xl border border-stone-200 bg-stone-50 p-4 md:grid-cols-4">
        <input
          required
          value={newUser.username}
          onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          placeholder="Usuario"
          autoComplete="off"
        />
        <input
          required
          type="password"
          value={newUser.password}
          onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
          className="rounded-lg border border-stone-300 px-3 py-2 text-sm"
          placeholder="Contraseña"
          autoComplete="new-password"
        />
        <select
          value={newUser.role}
          onChange={(e) => setNewUser({ ...newUser, role: e.target.value })}
          className="rounded-lg border border-stone-300 bg-white px-3 py-2 text-sm"
        >
          <option value="basic">Básico (ver y editar)</option>
          <option value="premium">Premium (crear, editar, eliminar)</option>
        </select>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-stone-900 px-4 py-2 text-sm font-medium text-white hover:bg-stone-700 disabled:opacity-60"
        >
          <Plus size={16} /> {loading ? 'Creando…' : 'Añadir usuario'}
        </button>
      </form>

      {/* Lista */}
      {users.length === 0 ? (
        <p className="rounded-lg border border-dashed border-stone-300 px-4 py-6 text-center text-sm text-stone-500">
          Este restaurante aún no tiene usuarios.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-stone-200">
          <table className="w-full text-sm">
            <tbody className="divide-y divide-stone-100">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-stone-50">
                  <td className="px-4 py-3">
                    <span className="flex items-center gap-2 font-medium text-stone-900">
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-stone-200 text-stone-600">
                        <User size={15} />
                      </span>
                      {u.username}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <select
                      value={u.role}
                      onChange={(e) => changeRole(u.id, e.target.value)}
                      className="rounded-md border border-stone-300 bg-white px-2 py-1 text-xs"
                    >
                      {Object.entries(ROLE_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>{label}</option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => deleteUser(u.id, u.username)}
                      title="Eliminar usuario"
                      className="rounded-lg border border-red-200 bg-red-50 px-2.5 py-1.5 text-red-600 hover:bg-red-100"
                    >
                      <Trash size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {message && (
        <p className="rounded-lg border border-stone-200 bg-stone-50 px-3 py-2 text-sm text-stone-700">
          {message}
        </p>
      )}
    </div>
  )
}

export default UserManager

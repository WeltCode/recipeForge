import { useEffect, useState } from 'react'
import { authFetch } from '../auth'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

// Flags editables por rol (mismo orden que el backend).
const FLAGS = [
  ['can_view_recipes', 'Ver recetas'],
  ['can_edit_recipes', 'Editar'],
  ['can_create_recipes', 'Crear'],
  ['can_delete_recipes', 'Borrar'],
  ['can_view_escandallo', 'Ver coste / escandallo'],
  ['can_manage_users', 'Gestionar usuarios'],
]

// Panel para ajustar los permisos (flags) de los 4 roles de un restaurante.
function RolesManager({ restaurantId }) {
  const [roles, setRoles] = useState([])
  const [message, setMessage] = useState('')

  const load = async () => {
    try {
      const res = await authFetch(`${API_BASE}/roles/?restaurant=${restaurantId}`)
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setRoles(await res.json())
    } catch (err) {
      setMessage(`No se pudieron cargar los roles: ${err.message}`)
    }
  }

  useEffect(() => {
    if (restaurantId) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restaurantId])

  const toggle = async (role, flag) => {
    const value = !role[flag]
    setRoles((rs) => rs.map((r) => (r.id === role.id ? { ...r, [flag]: value } : r)))
    setMessage('')
    try {
      const res = await authFetch(`${API_BASE}/roles/${role.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [flag]: value }),
      })
      if (!res.ok) throw new Error(`Error ${res.status}`)
      setMessage('Permisos actualizados.')
    } catch (err) {
      setMessage(`No se pudo guardar: ${err.message}`)
      load()  // revertir al estado real del servidor
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-sm text-[#6a635c]">
        Ajusta qué puede hacer cada rol en <strong className="text-[#3a352f]">este restaurante</strong>.
        Los cambios se aplican al instante.
      </p>

      <div className="rf-noscroll overflow-x-auto rounded-xl border border-[#c4ccd2]">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-[#eef1f3] text-left">
              <th className="rf-cond px-4 py-2.5 text-xs font-600 uppercase tracking-wide text-[#7a736b]" style={{ fontWeight: 600 }}>Rol</th>
              {FLAGS.map(([key, label]) => (
                <th key={key} className="rf-cond px-3 py-2.5 text-center text-[11px] font-500 uppercase tracking-wide text-[#7a736b]" style={{ fontWeight: 500 }}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[#d5dade]">
            {roles.map((role) => (
              <tr key={role.id} className="bg-white/50">
                <td className="px-4 py-2.5 font-semibold text-[#1c1611]">{role.name}</td>
                {FLAGS.map(([flag]) => (
                  <td key={flag} className="px-3 py-2.5 text-center">
                    <input
                      type="checkbox"
                      checked={Boolean(role[flag])}
                      onChange={() => toggle(role, flag)}
                      className="h-4 w-4 cursor-pointer accent-[#e8531f]"
                    />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && <p className="rounded-lg border border-[#c4ccd2] bg-white/60 px-3 py-2 text-sm text-[#5a5650]">{message}</p>}
    </div>
  )
}

export default RolesManager

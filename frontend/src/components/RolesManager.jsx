import { useEffect, useState } from 'react'
import { authFetch } from '../auth'
import { Lock } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

// Permisos editables por rol (mismo orden que el backend), con ayuda breve.
const FLAGS = [
  ['can_view_recipes', 'Ver recetas', 'Consultar las fichas técnicas'],
  ['can_edit_recipes', 'Editar recetas', 'Modificar fichas existentes'],
  ['can_create_recipes', 'Crear recetas', 'Dar de alta fichas nuevas'],
  ['can_delete_recipes', 'Borrar recetas', 'Eliminar fichas'],
  ['can_view_escandallo', 'Ver coste / escandallo', 'Acceso a costes y escandallo'],
  ['can_manage_users', 'Gestionar usuarios', 'Añadir y quitar personas del equipo'],
]

// Descripción y acento por rol (según su key estable).
const ROLE_META = {
  owner: { desc: 'Dueño — control total del restaurante y su equipo.', tint: 'var(--rf-ember)' },
  manager: { desc: 'Chef — crea, edita y borra fichas; ve costes.', tint: 'var(--rf-lamp)' },
  editor: { desc: 'Jefe de partida — edita, sin crear ni borrar.', tint: 'var(--rf-gold)' },
  viewer: { desc: 'Cocina — solo consulta las fichas.', tint: 'var(--color-steel-400)' },
}

function Toggle({ on, onClick, disabled }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={on}
      disabled={disabled}
      onClick={onClick}
      className={`relative inline-flex h-[22px] w-[38px] shrink-0 items-center rounded-full transition-colors disabled:opacity-50 ${on ? 'bg-ember' : 'bg-steel-300'}`}
    >
      <span className={`inline-block h-[16px] w-[16px] transform rounded-full bg-white shadow transition-transform ${on ? 'translate-x-[19px]' : 'translate-x-[3px]'}`} />
    </button>
  )
}

// Ajusta los permisos (flags) de los 4 roles de un restaurante, como tarjetas.
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
      load()
    }
  }

  return (
    <div className="space-y-4">
      <p className="text-[13px] text-ink-2">
        Define qué puede hacer cada rol. Los cambios se guardan al instante.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        {roles.map((role) => {
          const meta = ROLE_META[role.key] || ROLE_META.viewer
          const active = FLAGS.filter(([f]) => role[f]).length
          return (
            <div key={role.id} className="overflow-hidden rounded-2xl steel-plate">
              <div className="flex items-start gap-3 border-b border-steel-200 px-5 py-4">
                <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: meta.tint, boxShadow: `0 0 8px 1px ${meta.tint}55` }} aria-hidden />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="pass-title text-[17px] text-ink">{role.name}</h3>
                    <span className="data rounded-full bg-steel-200 px-2 py-0.5 text-[11px] font-medium text-ink-2">{active}/{FLAGS.length}</span>
                  </div>
                  <p className="mt-0.5 text-[12px] text-ink-3">{meta.desc}</p>
                </div>
              </div>
              <div className="divide-y divide-steel-200">
                {FLAGS.map(([flag, label, help]) => (
                  <label key={flag} className="flex cursor-pointer items-center gap-3 px-5 py-2.5 hover:bg-steel-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-medium text-ink">{label}</p>
                      <p className="truncate text-[11px] text-ink-3">{help}</p>
                    </div>
                    <Toggle on={Boolean(role[flag])} onClick={() => toggle(role, flag)} />
                  </label>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="flex items-start gap-2.5 rounded-xl bg-steel-200/60 p-3.5">
        <Lock size={15} className="mt-0.5 shrink-0 text-ink-3" />
        <p className="text-[12.5px] text-ink-2">
          El permiso efectivo de cada persona es el de su rol <span className="font-medium text-ink">y</span> lo que incluya el plan del restaurante. Por ejemplo, «Ver coste / escandallo» solo funciona con plan Business.
        </p>
      </div>

      {message && <p className="rounded-lg border border-steel-300 bg-white/60 px-3 py-2 text-[13px] text-ink-2">{message}</p>}
    </div>
  )
}

export default RolesManager

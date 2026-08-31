import { useEffect, useState } from 'react'
import { authFetch } from '../auth'
import { initials } from '../lib/ui'
import { Trash, Plus, Lock, X, Pencil } from './icons'

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
    ? { username: '', password: '', first_name: '', last_name: '', email: '', role: 'superadmin' }
    : { first_name: '', last_name: '', email: '', phone: '', role: 'viewer', title: '' }
  const [users, setUsers] = useState([])
  const [newUser, setNewUser] = useState({ ...emptyNewUser })
  const [message, setMessage] = useState('')
  const [tempCred, setTempCred] = useState(null) // { login, password } tras crear/restablecer
  const [loading, setLoading] = useState(false)
  const [editing, setEditing] = useState(null)   // usuario en edición (o null)
  const [editForm, setEditForm] = useState({})
  const [savingEdit, setSavingEdit] = useState(false)

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
        ? { username: newUser.username, password: newUser.password, role: 'superadmin',
            first_name: newUser.first_name, last_name: newUser.last_name, email: newUser.email }
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

  const openEdit = (u) => {
    setMessage('')
    setEditForm(admins
      ? { username: u.username || '', first_name: u.first_name || '', last_name: u.last_name || '', email: u.email || '' }
      : { first_name: u.first_name || '', last_name: u.last_name || '', email: u.email || '', title: u.title || '' })
    setEditing(u)
  }

  const saveEdit = async (e) => {
    e.preventDefault()
    setSavingEdit(true)
    setMessage('')
    try {
      const res = await authFetch(`${API_BASE}/users/${editing.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(Object.values(data).flat().join(' '))
      setMessage('Cambios guardados.')
      setEditing(null)
      loadUsers()
    } catch (err) {
      setMessage(`No se pudo guardar: ${err.message}`)
    } finally {
      setSavingEdit(false)
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

  const inputCls = 'rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/60 focus:ring-2 focus:ring-ember/15'
  const field = (label, key, opts = {}) => (
    <label className="flex flex-col gap-1 text-[12px] text-ink-2">{label}
      <input required={opts.required} type={opts.type || 'text'} value={newUser[key]}
        onChange={(e) => setNewUser({ ...newUser, [key]: e.target.value })}
        placeholder={opts.ph || ''} autoComplete="off" className={inputCls} /></label>
  )

  return (
    <div className="space-y-4">
      {/* Crear usuario */}
      <form onSubmit={createUser} className="rounded-2xl steel-plate p-5">
        <p className="pass-title mb-3 text-[14px] text-ink">{admins ? 'Nuevo administrador' : 'Nuevo usuario'}</p>
        {admins ? (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {field('Nombre', 'first_name', { ph: 'Iván' })}
              {field('Apellido', 'last_name', { ph: 'Hernández' })}
              {field('Correo', 'email', { type: 'email', ph: 'tu@correo.com' })}
              {field('Usuario *', 'username', { required: true, ph: 'ej. DedSec5' })}
              <label className="flex flex-col gap-1 text-[12px] text-ink-2">Contraseña *
                <input required type="password" value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} className={inputCls} placeholder="Contraseña" autoComplete="new-password" /></label>
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-ink-3">El admin entra con su usuario o su correo, y la contraseña que definas.</p>
              <button type="submit" disabled={loading} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">
                <Plus size={16} /> {loading ? 'Creando…' : 'Añadir admin'}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {field('Nombre *', 'first_name', { required: true })}
              {field('Apellido', 'last_name')}
              {field('Correo *', 'email', { required: true, type: 'email', ph: 'tu@correo.com' })}
              {field('Teléfono *', 'phone', { required: true })}
              <label className="flex flex-col gap-1 text-[12px] text-ink-2">Rol *
                <select value={newUser.role} onChange={(e) => setNewUser({ ...newUser, role: e.target.value })} className={inputCls} title={ROLE_HELP[newUser.role]}>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                </select></label>
              {field('Cargo (opcional)', 'title', { ph: 'ej. Sous chef' })}
            </div>
            <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
              <p className="text-[12px] text-ink-3">Se generará una contraseña temporal que el usuario cambiará al entrar.</p>
              <button type="submit" disabled={loading} className="inline-flex h-10 shrink-0 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">
                <Plus size={16} /> {loading ? 'Creando…' : 'Añadir usuario'}
              </button>
            </div>
          </>
        )}
      </form>

      {/* Contraseña temporal generada (mostrar una vez, para compartir) */}
      {tempCred && (
        <div className="flex items-start justify-between gap-3 rounded-xl border border-ember/30 bg-[#fff3ea] px-4 py-3">
          <div className="min-w-0">
            <p className="text-[13px] font-medium text-ember-deep">Contraseña temporal de «{tempCred.login}»</p>
            <p className="mt-0.5 text-[12px] text-ink-2">Compártela con el usuario. Deberá cambiarla al iniciar sesión.</p>
            <p className="data mt-1.5 select-all rounded-md bg-white px-2.5 py-1 text-[14px] font-medium text-ink">{tempCred.password}</p>
          </div>
          <button onClick={() => setTempCred(null)} className="shrink-0 text-ink-3 hover:text-ink"><X size={16} /></button>
        </div>
      )}

      {/* Lista */}
      {users.length === 0 ? (
        <p className="rounded-xl border border-dashed border-steel-300 px-4 py-8 text-center text-[13px] text-ink-3">
          {admins ? 'Aún no hay administradores.' : 'Este restaurante aún no tiene usuarios.'}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl steel-plate">
          {users.map((u, idx) => {
            const login = u.email || u.username
            const fullName = [u.first_name, u.last_name].filter(Boolean).join(' ')
            return (
              <div key={u.id} className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5 ${idx ? 'border-t border-steel-200' : ''}`}>
                <span className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-[12px] font-semibold text-white">
                  {u.avatar ? <img src={u.avatar} alt="" className="h-full w-full object-cover" /> : initials(fullName || login)}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium text-ink">{fullName || login}</p>
                  <p className="truncate text-[12px] text-ink-3">{login}{u.title ? ` · ${u.title}` : ''}</p>
                  {!admins && Array.isArray(u.restaurants) && u.restaurants.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {u.restaurants.map((r) => (
                        <span key={r.id} className="inline-flex items-center gap-1 rounded-full bg-[#f0ece5] px-2 py-0.5 text-[10.5px] text-ink-2">
                          {r.name}{r.role ? <span className="text-ink-3">· {ROLE_LABELS[r.role] || r.role}</span> : null}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                {u.must_change_password && <span className="rounded-full bg-[#f0e3c9] px-2 py-0.5 text-[10px] font-medium text-[#8a6a1f]">contraseña temporal</span>}
                {admins ? (
                  <span className="pass-title rounded-full bg-ember/12 px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-ember-deep">Super Admin</span>
                ) : (
                  <select value={u.role || 'viewer'} onChange={(e) => patchUser(u.id, { role: e.target.value })} className="rounded-lg border border-steel-300 bg-white px-2.5 py-1.5 text-[12px] text-ink outline-none focus:border-ember/60" title={ROLE_HELP[u.role]}>
                    {Object.entries(ROLE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                )}
                <div className="flex shrink-0 items-center gap-1">
                  <button onClick={() => openEdit(u)} title="Editar" className="inline-flex items-center gap-1 rounded-lg steel-plate px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-white"><Pencil size={14} /> Editar</button>
                  <button onClick={() => resetPassword(u.id, login)} title="Restablecer contraseña" className="inline-flex items-center gap-1 rounded-lg steel-plate px-2.5 py-1.5 text-[12px] font-medium text-ink hover:bg-white"><Lock size={14} /> Restablecer</button>
                  <button onClick={() => deleteUser(u.id, login)} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={15} /></button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {message && <p className="rounded-lg border border-steel-300 bg-white/60 px-3 py-2 text-[13px] text-ink-2">{message}</p>}

      {/* Modal de edición (nombre, correo y, para admins, usuario) */}
      {editing && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/65 p-4 backdrop-blur-sm" onClick={() => setEditing(null)}>
          <form onSubmit={saveEdit} className="w-full max-w-md rounded-2xl steel-plate p-5 shadow-2xl" onClick={(e) => e.stopPropagation()}>
            <div className="mb-4 flex items-center justify-between">
              <p className="pass-title text-[15px] text-ink">{admins ? 'Editar administrador' : 'Editar usuario'}</p>
              <button type="button" onClick={() => setEditing(null)} className="text-ink-3 hover:text-ink"><X size={18} /></button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="flex flex-col gap-1 text-[12px] text-ink-2">Nombre
                <input value={editForm.first_name} onChange={(e) => setEditForm({ ...editForm, first_name: e.target.value })} className={inputCls} autoComplete="off" /></label>
              <label className="flex flex-col gap-1 text-[12px] text-ink-2">Apellido
                <input value={editForm.last_name} onChange={(e) => setEditForm({ ...editForm, last_name: e.target.value })} className={inputCls} autoComplete="off" /></label>
              <label className="flex flex-col gap-1 text-[12px] text-ink-2 sm:col-span-2">Correo
                <input type="email" value={editForm.email} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} className={inputCls} placeholder="tu@correo.com" autoComplete="off" /></label>
              {admins ? (
                <label className="flex flex-col gap-1 text-[12px] text-ink-2 sm:col-span-2">Usuario
                  <input required value={editForm.username} onChange={(e) => setEditForm({ ...editForm, username: e.target.value })} className={inputCls} autoComplete="off" /></label>
              ) : (
                <label className="flex flex-col gap-1 text-[12px] text-ink-2 sm:col-span-2">Cargo
                  <input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} className={inputCls} placeholder="ej. Sous chef" autoComplete="off" /></label>
              )}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button type="button" onClick={() => setEditing(null)} className="rounded-lg border border-steel-300 bg-white px-4 py-2 text-sm font-medium text-ink-2 hover:bg-steel-100">Cancelar</button>
              <button type="submit" disabled={savingEdit} className="rounded-lg bg-ember px-4 py-2 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">{savingEdit ? 'Guardando…' : 'Guardar cambios'}</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}

export default UserManager

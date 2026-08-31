import { useState } from 'react'
import { authFetch } from '../auth'
import UserManager from './UserManager'
import RolesManager from './RolesManager'
import { RecipeCard } from './Dashboard'
import { Embers, initials } from '../lib/ui'
import { CURRENCY_OPTS } from '../lib/money'
import { TEMPLATES } from '../templates'
import { ArrowLeft, Book, User, Plus, Search, Cloche, Pencil, Lock } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'

const TABS = [
  { id: 'recipes', label: 'Recetas', icon: Book },
  { id: 'users', label: 'Usuarios', icon: User },
  { id: 'roles', label: 'Roles', icon: Lock },
  { id: 'info', label: 'Información', icon: Pencil },
]

function RestaurantDetail({
  restaurant, recipes, canDelete, onBack, onUpdated, onAddRestaurantToOwner,
  onOpenRecipe, onNewRecipe, onDeleteRecipe, onDownloadPDF,
}) {
  const owner = (restaurant.members || []).find((m) => m.role === 'owner') || (restaurant.members || [])[0]
  const [tab, setTab] = useState('recipes')
  const [query, setQuery] = useState('')

  const [form, setForm] = useState({
    name: restaurant.name || '',
    code_prefix: restaurant.code_prefix || '',
    tax_id: restaurant.tax_id || '',
    currency: restaurant.currency || 'EUR',
    plan: restaurant.plan || 'basico',
    default_template: restaurant.default_template || 'formal',
    contact_email: restaurant.contact_email || '',
    contact_phone: restaurant.contact_phone || '',
    address: restaurant.address || '',
  })
  const pendingReq = restaurant.pending_plan_request || null
  const [logoFile, setLogoFile] = useState(null)
  const [savingInfo, setSavingInfo] = useState(false)
  const [infoMsg, setInfoMsg] = useState('')
  const [delConfirm, setDelConfirm] = useState('')
  const [deleting, setDeleting] = useState(false)
  const [delErr, setDelErr] = useState('')

  const deleteRestaurant = async () => {
    setDeleting(true)
    setDelErr('')
    try {
      const res = await authFetch(`${API_BASE}/restaurants/${restaurant.id}/`, { method: 'DELETE' })
      if (!res.ok && res.status !== 204) throw new Error(`Error ${res.status}`)
      onUpdated?.()  // refresca la lista
      onBack?.()     // vuelve a "Todos los restaurantes"
    } catch (err) {
      setDelErr(`No se pudo eliminar: ${err.message}`)
      setDeleting(false)
    }
  }

  const filtered = recipes.filter((r) => {
    const q = query.trim().toLowerCase()
    if (!q) return true
    return [r.name, r.code, r.category].filter(Boolean).some((v) => v.toLowerCase().includes(q))
  })

  const saveInfo = async (e) => {
    e.preventDefault()
    setSavingInfo(true)
    setInfoMsg('')
    try {
      let res
      if (logoFile) {
        const fd = new FormData()
        Object.entries(form).forEach(([k, v]) => fd.append(k, v))
        fd.append('logo', logoFile)
        res = await authFetch(`${API_BASE}/restaurants/${restaurant.id}/`, { method: 'PATCH', body: fd })
      } else {
        res = await authFetch(`${API_BASE}/restaurants/${restaurant.id}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form),
        })
      }
      if (!res.ok) throw new Error(`Error ${res.status}`)
      // Si había una solicitud de plan pendiente y se aplicó ese plan, se marca resuelta.
      if (pendingReq && form.plan === pendingReq.requested_plan) {
        await authFetch(`${API_BASE}/plan-requests/${pendingReq.id}/`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'done' }),
        }).catch(() => {})
      }
      setInfoMsg('Información actualizada.')
      setLogoFile(null)
      onUpdated?.()
    } catch (err) {
      setInfoMsg(`No se pudo guardar: ${err.message}`)
    } finally {
      setSavingInfo(false)
    }
  }

  return (
    <div className="rf-steel-surface min-h-screen">
      {/* Cabecera del restaurante (zona caliente) */}
      <header className="rf-hot rf-grain relative overflow-hidden">
        <Embers count={10} />
        <div className="relative mx-auto max-w-6xl px-5 py-6 md:px-8">
          <button
            onClick={onBack}
            className="flex items-center gap-2 rounded-full border border-white/12 bg-white/[.06] px-4 py-2 text-sm font-medium text-white/90 backdrop-blur transition hover:bg-white/[.12]"
          >
            <ArrowLeft size={17} /> Todos los restaurantes
          </button>

          <div className="mt-6 flex items-center gap-5">
            <div className="rf-steel rf-edge flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-[#9aa2a9]/60 p-1.5 shadow-lg">
              {restaurant.logo ? (
                <img src={restaurant.logo} alt={restaurant.name} className="h-full w-full object-contain" />
              ) : (
                <span className="text-2xl font-bold text-[#8a9098]">{initials(restaurant.name)}</span>
              )}
            </div>
            <div>
              <p className="rf-cond flex items-center gap-2 text-xs uppercase tracking-[0.18em] text-[#ff9a3d]">
                Restaurante
                {restaurant.code_prefix && (
                  <span className="rf-cell rounded px-1.5 py-0.5 text-[11px] text-[#ffcf9e]">{restaurant.code_prefix}</span>
                )}
              </p>
              <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{restaurant.name}</h1>
              <div className="rf-mono mt-2 flex flex-wrap gap-4 text-sm text-white/55">
                <span className="flex items-center gap-1.5"><Book size={15} /> {recipes.length} recetas</span>
                <span className="flex items-center gap-1.5"><User size={15} /> {restaurant.member_count} usuarios</span>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="rf-noscroll mt-7 flex gap-1 overflow-x-auto">
            {TABS.map((t) => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setTab(t.id)}
                  className={`rf-cond flex shrink-0 items-center gap-2 rounded-t-xl px-3 py-2.5 text-sm font-500 uppercase tracking-wide transition sm:px-4 ${
                    tab === t.id ? 'bg-[#dfe3e7] text-[#1c1611]' : 'text-white/70 hover:bg-white/[.08]'
                  }`}
                  style={{ fontWeight: 500 }}
                >
                  <Icon size={16} /> {t.label}
                </button>
              )
            })}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-5 pb-20 pt-8 md:px-8">
        {/* ── RECETAS ── */}
        {tab === 'recipes' && (
          <>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="relative sm:w-72">
                <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[#9a9188]">
                  <Search size={18} />
                </span>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Buscar receta…"
                  className="w-full rounded-xl border border-[#b9c0c6] bg-white py-2.5 pl-10 pr-3 text-sm text-[#1c1611] shadow-[inset_0_1px_2px_rgba(20,16,8,0.07)] outline-none focus:border-[#e8531f] focus:ring-2 focus:ring-[#e8531f]/25"
                />
              </div>
              <button
                onClick={() => onNewRecipe(restaurant.code_prefix)}
                className="rf-ember-btn rf-cond flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-600 uppercase tracking-wide text-white transition hover:-translate-y-0.5"
                style={{ fontWeight: 600 }}
              >
                <Plus size={18} /> Nueva receta
              </button>
            </div>

            {filtered.length === 0 ? (
              <div className="rf-steel rf-edge mt-8 flex flex-col items-center rounded-2xl border border-dashed border-[#aeb6bd] py-16 text-center">
                <Cloche size={40} className="text-[#b1b9c0]" />
                <p className="mt-3 font-semibold text-[#3a352f]">
                  {recipes.length === 0 ? 'Este restaurante aún no tiene recetas' : 'Sin resultados'}
                </p>
              </div>
            ) : (
              <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((r, i) => (
                  <RecipeCard
                    key={r.id}
                    recipe={r}
                    index={i}
                    canDelete={canDelete}
                    onEdit={() => onOpenRecipe(r.id)}
                    onDelete={() => onDeleteRecipe(r.id, r.name)}
                    onPDF={() => onDownloadPDF(r.id)}
                  />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── USUARIOS ── */}
        {tab === 'users' && (
          <div>
            <h2 className="rf-cond mb-1 text-xl font-600 uppercase tracking-wide text-[#1c1611]" style={{ fontWeight: 600 }}>Usuarios del restaurante</h2>
            <p className="mb-5 text-sm text-[#6a635c]">
              Cada usuario solo verá y gestionará las recetas de <strong className="text-[#3a352f]">{restaurant.name}</strong>.
            </p>
            <UserManager restaurantId={restaurant.id} />
          </div>
        )}

        {/* ── ROLES Y PERMISOS ── */}
        {tab === 'roles' && (
          <div>
            <h2 className="rf-cond mb-1 text-xl font-600 uppercase tracking-wide text-[#1c1611]" style={{ fontWeight: 600 }}>Roles y permisos</h2>
            <p className="mb-5 text-sm text-[#6a635c]">
              Define qué puede hacer cada rol en <strong className="text-[#3a352f]">{restaurant.name}</strong>.
            </p>
            <RolesManager restaurantId={restaurant.id} />
          </div>
        )}

        {/* ── INFORMACIÓN ── */}
        {tab === 'info' && (() => {
          const inp = 'rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/60 focus:ring-2 focus:ring-ember/15'
          const logoPreview = logoFile ? URL.createObjectURL(logoFile) : restaurant.logo
          const canDeleteRestaurant = delConfirm.trim() === restaurant.name.trim()
          return (
          <div className="max-w-3xl space-y-8">
          <form onSubmit={saveInfo} className="space-y-5">
            {/* Identidad + marca */}
            <section className="rounded-2xl steel-plate p-5 sm:p-6">
              <p className="pass-title mb-4 text-[15px] text-ink">Identidad y marca</p>
              <div className="flex flex-col gap-5 sm:flex-row">
                <div className="flex flex-col items-center gap-2">
                  <div className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-2xl border border-steel-300 bg-steel-50">
                    {logoPreview ? <img src={logoPreview} alt="" className="h-full w-full object-contain p-1.5" /> : <span className="pass-title text-2xl text-steel-400">{initials(form.name)}</span>}
                  </div>
                  <label className="cursor-pointer text-[12px] font-medium text-ember-deep hover:text-ember">
                    Cambiar logo
                    <input type="file" accept="image/*" onChange={(e) => setLogoFile(e.target.files?.[0] ?? null)} className="hidden" />
                  </label>
                </div>
                <div className="grid flex-1 gap-3 sm:grid-cols-2">
                  <label className="flex flex-col gap-1 text-[12px] text-ink-2 sm:col-span-2">Nombre del restaurante *
                    <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} /></label>
                  <label className="flex flex-col gap-1 text-[12px] text-ink-2">Prefijo de código
                    <input value={form.code_prefix} onChange={(e) => setForm({ ...form, code_prefix: e.target.value.toUpperCase() })} className={`${inp} data uppercase`} placeholder="LT" maxLength={12} />
                    <span className="text-[11px] text-ink-3">Ej: {form.code_prefix || 'LT'}-001</span></label>
                  <label className="flex flex-col gap-1 text-[12px] text-ink-2">CIF / NIF
                    <input value={form.tax_id} onChange={(e) => setForm({ ...form, tax_id: e.target.value })} className={inp} placeholder="B-12345678" /></label>
                  <label className="flex flex-col gap-1 text-[12px] text-ink-2">Moneda
                    <select value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value })} className={inp}>
                      {CURRENCY_OPTS.map(([code, label]) => <option key={code} value={code}>{label}</option>)}
                    </select>
                    <span className="text-[11px] text-ink-3">Se usa en precios, costes y ventas.</span></label>
                </div>
              </div>
            </section>

            {/* Contacto */}
            <section className="rounded-2xl steel-plate p-5 sm:p-6">
              <p className="pass-title mb-4 text-[15px] text-ink">Contacto</p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-[12px] text-ink-2">Email de contacto
                  <input type="email" value={form.contact_email} onChange={(e) => setForm({ ...form, contact_email: e.target.value })} className={inp} placeholder="contacto@restaurante.com" /></label>
                <label className="flex flex-col gap-1 text-[12px] text-ink-2">Teléfono
                  <input value={form.contact_phone} onChange={(e) => setForm({ ...form, contact_phone: e.target.value })} className={inp} placeholder="+34 600 000 000" /></label>
                <label className="flex flex-col gap-1 text-[12px] text-ink-2 sm:col-span-2">Dirección
                  <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} className={inp} placeholder="Av. Principal 123" /></label>
              </div>
            </section>

            {/* Plan y fichas */}
            <section className="rounded-2xl steel-plate p-5 sm:p-6">
              <p className="pass-title mb-4 text-[15px] text-ink">Plan y fichas</p>

              {pendingReq && (
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-[#d89b3a]/40 bg-[#fdf5e6] p-4">
                  <p className="text-[13px] text-[#7a5a12]">El dueño solicitó el plan <span className="font-semibold">{pendingReq.requested_plan_display}</span>.</p>
                  <button type="button" onClick={() => setForm({ ...form, plan: pendingReq.requested_plan })} className="rounded-lg bg-[#d89b3a] px-3 py-2 text-[12px] font-semibold text-white hover:bg-[#c68a2e]">Aplicar {pendingReq.requested_plan_display}</button>
                </div>
              )}

              <label className="flex flex-col gap-1 text-[12px] text-ink-2">
                <span className="flex items-center gap-1.5"><Lock size={13} /> Plan de suscripción</span>
                <select value={form.plan} onChange={(e) => setForm({ ...form, plan: e.target.value })} className={`${inp} sm:max-w-md`}>
                  <option value="prueba">Prueba — 5 recetas · 30 días · marca de agua</option>
                  <option value="basico">Básico (Cocinero) — recetas ilimitadas · escandallo · alérgenos · 1 usuario</option>
                  <option value="pro">Premium — + plantillas, inventario, multiusuario (8)</option>
                  <option value="business">Business — + proveedores, roles, 20 usuarios, multi-local</option>
                </select>
                <span className="text-[11px] text-ink-3">Define qué funciones tiene disponibles este restaurante.</span>
              </label>

              <p className="mt-4 mb-1.5 text-[12px] text-ink-2">Plantilla por defecto de las fichas</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {TEMPLATES.map((t) => {
                  const active = form.default_template === t.id
                  return (
                    <button key={t.id} type="button" onClick={() => setForm({ ...form, default_template: t.id })} title={t.desc}
                      className={`rounded-xl border px-3 py-2.5 text-left transition ${active ? 'border-ember bg-ember/8 ring-2 ring-ember/15' : 'border-steel-300 bg-white hover:border-steel-400'}`}>
                      <span className={`block text-[13px] font-semibold ${active ? 'text-ember-deep' : 'text-ink'}`}>{t.label}</span>
                      <span className="mt-0.5 block text-[11px] leading-tight text-ink-3">{t.desc}</span>
                    </button>
                  )
                })}
              </div>
            </section>

            <div className="sticky bottom-3 flex items-center gap-3 rounded-2xl steel-plate px-4 py-3">
              <button type="submit" disabled={savingInfo} className="inline-flex h-10 items-center rounded-lg bg-ember px-5 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">
                {savingInfo ? 'Guardando…' : 'Guardar cambios'}
              </button>
              {infoMsg && <span className="text-[13px] text-ink-2">{infoMsg}</span>}
            </div>
          </form>

          {/* Añadir otro restaurante al mismo dueño (multi-local) */}
          {owner && onAddRestaurantToOwner && (
            <section className="rounded-2xl steel-plate p-5">
              <h3 className="pass-title text-[15px] text-ink">Más locales de este dueño</h3>
              <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
                Da de alta otro restaurante ligado a <span className="font-semibold text-ink">{owner.role_name || 'el dueño'} «{owner.username}»</span> (su 2º local, mismo dueño).
              </p>
              <button
                type="button"
                onClick={() => onAddRestaurantToOwner(owner.username)}
                className="mt-3 inline-flex h-10 items-center gap-2 rounded-lg bg-soot px-4 text-sm font-medium text-cream transition hover:bg-carbon-2"
              >
                <Plus size={16} /> Añadir otro restaurante a este dueño
              </button>
            </section>
          )}

          {/* Zona de peligro: eliminar el restaurante (destructivo, en cascada) */}
          <section className="rounded-2xl border border-danger/35 bg-danger/[.04] p-5">
            <h3 className="pass-title text-[15px] text-danger">Zona de peligro</h3>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-ink-2">
              Eliminar «<span className="font-semibold text-ink">{restaurant.name}</span>» borra de forma
              <strong> permanente e irreversible</strong> todo su contenido: recetas, escandallos, inventario,
              proveedores, carta y los accesos de sus usuarios a este restaurante. No se puede deshacer.
            </p>
            <label className="mt-4 block text-[12.5px] font-medium text-ink-2">
              Para confirmar, escribe el nombre exacto del restaurante: <span className="data text-ink">{restaurant.name}</span>
            </label>
            <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
              <input
                value={delConfirm}
                onChange={(e) => setDelConfirm(e.target.value)}
                placeholder={restaurant.name}
                className="rounded-lg border border-danger/40 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-danger focus:ring-2 focus:ring-danger/15 sm:max-w-xs"
              />
              <button
                type="button"
                onClick={deleteRestaurant}
                disabled={!canDeleteRestaurant || deleting}
                className="inline-flex h-10 items-center justify-center rounded-lg bg-danger px-5 text-sm font-medium text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {deleting ? 'Eliminando…' : 'Eliminar restaurante'}
              </button>
            </div>
            {delErr && <p className="mt-2 text-[13px] text-danger">{delErr}</p>}
          </section>
          </div>
          )
        })()}
      </main>
    </div>
  )
}

export default RestaurantDetail

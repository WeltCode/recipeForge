import { useRef, useState } from 'react'
import { authFetch, getAvatar, getFirstName, getUsername, uploadAvatar, deleteAvatar } from '../auth'
import ChangePassword from './ChangePassword'
import { capitalize, initials } from '../lib/ui'
import { User, Trash, Flame } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'
const PLAN_LABELS = { prueba: 'Prueba', basico: 'Básico (Cocinero)', pro: 'Premium', business: 'Business' }
const PLAN_OPTS = [['basico', 'Básico (Cocinero)'], ['pro', 'Premium'], ['business', 'Business']]

// Redimensiona la foto a un cuadrado pequeño en el navegador ANTES de subir, para
// que la subida a R2 sea casi instantánea (una foto de móvil de varios MB → ~30 KB).
function resizeImage(file, size = 256, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const img = new Image()
    const url = URL.createObjectURL(file)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const canvas = document.createElement('canvas')
      canvas.width = size
      canvas.height = size
      const ctx = canvas.getContext('2d')
      const scale = Math.max(size / img.width, size / img.height) // recorte "cover" centrado
      const w = img.width * scale
      const h = img.height * scale
      ctx.drawImage(img, (size - w) / 2, (size - h) / 2, w, h)
      canvas.toBlob((blob) => (blob ? resolve(new File([blob], 'avatar.jpg', { type: 'image/jpeg' })) : reject(new Error('No se pudo procesar la imagen.'))), 'image/jpeg', quality)
    }
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Imagen no válida.')) }
    img.src = url
  })
}

// Sección Ajustes: foto de perfil (todos), cambio de contraseña (todos) y
// solicitud de cambio de plan (solo owner). Oculta para el plan de prueba.
export default function AjustesSection({ restaurantName, plan, role, onAvatarChange }) {
  const isOwner = role === 'owner' || role === 'superadmin'
  const [avatar, setAvatarUrl] = useState(getAvatar())
  const [photoMsg, setPhotoMsg] = useState('')
  const [busy, setBusy] = useState(false)
  const fileRef = useRef(null)
  const name = capitalize(getFirstName() || getUsername())

  const onPick = () => fileRef.current?.click()
  const onFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    if (!f.type.startsWith('image/')) { setPhotoMsg('El archivo debe ser una imagen.'); return }
    setBusy(true); setPhotoMsg('Subiendo…')
    try {
      const small = await resizeImage(f)
      setAvatarUrl(await uploadAvatar(small))
      setPhotoMsg('Foto actualizada.')
      onAvatarChange && onAvatarChange()
    } catch (err) { setPhotoMsg(err.message) } finally { setBusy(false) }
  }
  const onRemove = async () => {
    setBusy(true); setPhotoMsg('')
    try { await deleteAvatar(); setAvatarUrl(''); setPhotoMsg('Foto quitada.'); onAvatarChange && onAvatarChange() }
    catch (err) { setPhotoMsg(err.message) } finally { setBusy(false) }
  }

  // Solicitud de cambio de plan (owner).
  const [reqPlan, setReqPlan] = useState('')
  const [note, setNote] = useState('')
  const [reqMsg, setReqMsg] = useState('')
  const [sending, setSending] = useState(false)
  const submitPlan = async (e) => {
    e.preventDefault()
    if (!reqPlan) { setReqMsg('Elige un plan.'); return }
    setSending(true); setReqMsg('')
    try {
      const res = await authFetch(`${API_BASE}/plan-requests/`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requested_plan: reqPlan, note }),
      })
      if (!res.ok) throw new Error(Object.values(await res.json()).flat().join(' '))
      setReqMsg(`Solicitud de plan ${PLAN_LABELS[reqPlan]} enviada. El administrador la activará.`)
      setReqPlan(''); setNote('')
    } catch (err) { setReqMsg(err.message) } finally { setSending(false) }
  }

  const card = 'rounded-2xl steel-plate p-5'
  return (
    <div className="max-w-2xl space-y-5 pb-6">
      <h2 className="rf-cond text-2xl uppercase tracking-wide text-ink" style={{ fontWeight: 600 }}>Ajustes</h2>

      {/* Foto de perfil */}
      <div className={card}>
        <p className="pass-title text-[13px] text-ink">Foto de perfil</p>
        <div className="mt-3 flex items-center gap-4">
          <div className="grid h-16 w-16 shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-[#ff7a34] to-[#c8371a] text-[18px] font-semibold text-white">
            {avatar ? <img src={avatar} alt="" className="h-full w-full object-cover" /> : <span>{initials(name)}</span>}
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={onPick} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60"><User size={15} /> {avatar ? 'Cambiar foto' : 'Subir foto'}</button>
            {avatar && <button onClick={onRemove} disabled={busy} className="inline-flex h-9 items-center gap-1.5 rounded-lg steel-plate px-3 text-sm text-ink hover:bg-white disabled:opacity-60"><Trash size={15} /> Quitar</button>}
            <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
          </div>
        </div>
        {photoMsg && <p className="mt-2 text-[13px] text-ink-2">{photoMsg}</p>}
      </div>

      {/* Restaurante y plan */}
      <div className={card}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="pass-title text-[13px] text-ink">Restaurante</p>
            <p className="mt-0.5 text-[15px] font-medium text-ink">{restaurantName || '—'}</p>
          </div>
          <div className="text-right">
            <p className="pass-title text-[12px] text-ink-3">Plan actual</p>
            <p className="text-[15px] font-semibold text-ember-deep">{PLAN_LABELS[plan] || plan || '—'}</p>
          </div>
        </div>

        {isOwner ? (
          <form onSubmit={submitPlan} className="mt-4 border-t border-steel-200 pt-4">
            <p className="pass-title text-[13px] text-ink">Solicitar cambio de plan</p>
            <p className="mt-0.5 text-[12px] text-ink-3">Elige el plan que quieres. El administrador lo activa (el cobro es manual por ahora).</p>
            <div className="mt-3 flex flex-wrap items-end gap-2">
              <label className="flex flex-col gap-1 text-[12px] text-ink-2">Plan
                <select value={reqPlan} onChange={(e) => setReqPlan(e.target.value)} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                  <option value="">— elige —</option>
                  {PLAN_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
                </select></label>
              <input value={note} onChange={(e) => setNote(e.target.value)} placeholder="Nota para el administrador (opcional)" className="min-w-[200px] flex-1 rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" />
              <button type="submit" disabled={sending} className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60"><Flame size={16} /> {sending ? 'Enviando…' : 'Solicitar'}</button>
            </div>
            {reqMsg && <p className="mt-2 text-[13px] text-ink-2">{reqMsg}</p>}
          </form>
        ) : (
          <p className="mt-3 border-t border-steel-200 pt-3 text-[12px] text-ink-3">El cambio de plan lo solicita el dueño del restaurante.</p>
        )}
      </div>

      {/* Cambiar contraseña */}
      <div className={card}>
        <p className="pass-title text-[13px] text-ink">Cambiar contraseña</p>
        <div className="mt-3">
          <ChangePassword onDone={() => { /* queda logueado */ }} submitLabel="Actualizar contraseña" />
        </div>
      </div>
    </div>
  )
}

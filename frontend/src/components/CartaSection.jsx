import { useEffect, useState } from 'react'
import { authFetch, getPublicSlug, getCartaPublished, setCartaPublished } from '../auth'
import { money, currencySymbol } from '../lib/money'
import {
  listEspeciales, createEspecial, updateEspecial, deleteEspecial,
  setRecipeMenu, uploadMenuPhoto, setCartaPublishedApi, publicUrl, qrDataUrl,
  TEMP_OPTS, CAT_OPTS, FORMATO_OPTS,
} from '../lib/carta'
import { Plus, Trash, Pencil, X } from './icons'

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000/api'
const inp = 'rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/60 focus:ring-2 focus:ring-ember/15'

// Tarjeta con el QR de una URL pública + descargar (imprimir) y ver la página.
function QrCard({ title, url, hint, openLabel = 'Ver la página' }) {
  const [img, setImg] = useState('')
  useEffect(() => { let ok = true; qrDataUrl(url).then((d) => ok && setImg(d)).catch(() => {}); return () => { ok = false } }, [url])
  return (
    <div className="rounded-2xl steel-plate p-5">
      <p className="pass-title text-[13px] text-ink">{title}</p>
      <p className="mt-0.5 text-[12px] text-ink-3">{hint}</p>
      <div className="mt-3 flex flex-wrap items-center gap-4">
        <img src={img || undefined} alt="QR" className="h-36 w-36 shrink-0 rounded-lg border border-steel-200 bg-white p-2" />
        <div className="min-w-0 flex-1 space-y-2">
          <p className="text-[12px] text-ink-2">Este QR lleva a:</p>
          <a href={url} target="_blank" rel="noreferrer" className="data block truncate text-[13px] text-ember-deep underline">{url}</a>
          <div className="flex flex-wrap gap-2">
            {img && <a href={img} download={`${title.replace(/\s+/g, '-').toLowerCase()}.png`} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-ember px-3.5 text-sm font-medium text-cream hover:bg-ember-hi">Descargar para imprimir</a>}
            <a href={url} target="_blank" rel="noreferrer" className="inline-flex h-9 items-center gap-1.5 rounded-lg steel-plate px-3.5 text-sm text-ink hover:bg-white">{openLabel}</a>
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Pestaña Carta: publicar + marcar platos ──
function CartaTab({ slug }) {
  const [recipes, setRecipes] = useState([])
  const [edits, setEdits] = useState({})        // id → {on_menu, menu_section, menu_price}
  const [published, setPub] = useState(getCartaPublished())
  const [msg, setMsg] = useState('')

  const load = async () => {
    const res = await authFetch(`${API_BASE}/recipes/`)
    if (res.ok) {
      const data = await res.json()
      setRecipes(data)
      const e = {}
      data.forEach((r) => { e[r.id] = { on_menu: !!r.on_menu, menu_section: r.menu_section || '', menu_price: r.menu_price ?? '' } })
      setEdits(e)
    }
  }
  useEffect(() => { load() }, [])

  const upd = (id, k, v) => setEdits((e) => ({ ...e, [id]: { ...e[id], [k]: v } }))
  const saveRow = async (id) => {
    const e = edits[id]
    try {
      await setRecipeMenu(id, {
        on_menu: e.on_menu, menu_section: e.menu_section,
        menu_price: e.menu_price === '' ? null : e.menu_price,
      })
      setMsg('Guardado.')
    } catch (err) { setMsg(err.message) }
  }
  const togglePublish = async () => {
    try {
      const r = await setCartaPublishedApi(!published)
      setPub(r.carta_published); setCartaPublished(r.carta_published)
      setMsg(r.carta_published ? 'Carta publicada.' : 'Carta despublicada.')
    } catch (err) { setMsg(err.message) }
  }
  const onPhoto = async (id, file) => {
    if (!file) return
    try { await uploadMenuPhoto(id, file); setMsg('Foto de la carta actualizada.'); load() }
    catch (err) { setMsg(err.message) }
  }

  const onMenuCount = Object.values(edits).filter((e) => e.on_menu).length

  return (
    <div className="space-y-5">
      {/* Publicar + QR */}
      <div className="rounded-2xl steel-plate p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="pass-title text-[13px] text-ink">Carta pública</p>
            <p className="mt-0.5 text-[12px] text-ink-3">{onMenuCount} plato(s) en la carta. Publícala para que el QR funcione.</p>
          </div>
          <button onClick={togglePublish} className={`inline-flex h-9 items-center gap-2 rounded-lg px-4 text-sm font-medium ${published ? 'bg-ember text-cream hover:bg-ember-hi' : 'steel-plate text-ink hover:bg-white'}`}>
            {published ? 'Publicada ✓' : 'Publicar carta'}
          </button>
        </div>
      </div>
      {slug && <QrCard title="QR de la Carta" url={publicUrl('carta', slug)} openLabel="Ver la carta" hint={published ? 'Ponlo en las mesas: tus clientes escanean y ven la carta.' : 'Este QR es fijo. Publica la carta para que muestre el contenido al escanearlo.'} />}

      {/* Platos */}
      <div className="overflow-hidden rounded-2xl steel-plate">
        <div className="border-b border-steel-200 px-4 py-3 sm:px-5">
          <p className="pass-title text-[13px] text-ink">Platos en la carta</p>
          <p className="mt-0.5 text-[12px] text-ink-3">Marca los platos, ponles sección y precio ({currencySymbol()}).</p>
        </div>
        {recipes.length === 0 ? (
          <p className="px-5 py-8 text-center text-[13px] text-ink-3">Aún no tienes recetas.</p>
        ) : recipes.map((r, idx) => {
          const e = edits[r.id] || {}
          return (
            <div key={r.id} className={`px-4 py-3 sm:px-5 ${idx ? 'border-t border-steel-200' : ''}`}>
              <div className="flex flex-wrap items-center gap-3">
                <label className="flex items-center gap-2 text-[14px] text-ink">
                  <input type="checkbox" checked={!!e.on_menu} onChange={(ev) => upd(r.id, 'on_menu', ev.target.checked)} className="h-4 w-4 accent-[#e0611f]" />
                  <span className="font-medium">{r.name}</span>
                </label>
                {e.on_menu && (
                  <div className="flex flex-1 flex-wrap items-center justify-end gap-2">
                    <label className="inline-flex h-9 cursor-pointer items-center gap-1.5 rounded-lg steel-plate px-2.5 text-[12px] text-ink hover:bg-white" title="Foto propia para la carta (si no, usa la de la ficha)">
                      {r.menu_photo ? <img src={r.menu_photo} alt="" className="h-6 w-6 rounded object-cover" /> : null}
                      {r.menu_photo ? 'Cambiar foto' : 'Subir foto'}
                      <input type="file" accept="image/*" className="hidden" onChange={(ev) => onPhoto(r.id, ev.target.files?.[0])} />
                    </label>
                    <input value={e.menu_section} onChange={(ev) => upd(r.id, 'menu_section', ev.target.value)} placeholder="Sección (Entrantes…)" className={`${inp} w-40`} />
                    <input value={e.menu_price} onChange={(ev) => upd(r.id, 'menu_price', ev.target.value)} placeholder={`Precio ${currencySymbol()}`} inputMode="decimal" className={`${inp} w-28`} />
                  </div>
                )}
                <button onClick={() => saveRow(r.id)} className="inline-flex h-9 items-center rounded-lg bg-ember px-3 text-sm font-medium text-cream hover:bg-ember-hi">Guardar</button>
              </div>
            </div>
          )
        })}
      </div>
      {msg && <p className="rounded-lg border border-steel-300 bg-white/60 px-3 py-2 text-[13px] text-ink-2">{msg}</p>}
    </div>
  )
}

// ── Pestaña Especiales: CRUD ──
const EMPTY_ESP = { name: '', price: '', description: '', sales_pitch: '', temperatura: '', categoria: '', formato: '', para_personas: '', available: true, photo: null }

function EspecialesTab({ slug }) {
  const [items, setItems] = useState([])
  const [form, setForm] = useState({ ...EMPTY_ESP })
  const [editId, setEditId] = useState(null)
  const [msg, setMsg] = useState('')

  const load = async () => { try { setItems(await listEspeciales()) } catch (err) { setMsg(err.message) } }
  useEffect(() => { load() }, [])

  const reset = () => { setForm({ ...EMPTY_ESP }); setEditId(null) }
  const submit = async (ev) => {
    ev.preventDefault()
    try {
      const data = { ...form, price: form.price === '' ? null : form.price, para_personas: form.para_personas === '' ? null : form.para_personas }
      if (!(data.photo instanceof File)) delete data.photo
      if (editId) await updateEspecial(editId, data)
      else await createEspecial(data)
      setMsg(editId ? 'Especial actualizado.' : 'Especial añadido.')
      reset(); load()
    } catch (err) { setMsg(err.message) }
  }
  const edit = (it) => {
    setEditId(it.id)
    setForm({ name: it.name, price: it.price ?? '', description: it.description || '', sales_pitch: it.sales_pitch || '', temperatura: it.temperatura || '', categoria: it.categoria || '', formato: it.formato || '', para_personas: it.para_personas ?? '', available: it.available, photo: null })
  }
  const remove = async (it) => { if (!window.confirm(`¿Eliminar «${it.name}»?`)) return; try { await deleteEspecial(it.id); load() } catch (err) { setMsg(err.message) } }

  return (
    <div className="space-y-5">
      {slug && <QrCard title="QR de los Especiales" url={publicUrl('especiales', slug)} openLabel="Ver los especiales" hint="Un QR aparte, solo para los especiales fuera de carta." />}

      {/* Formulario */}
      <form onSubmit={submit} className="rounded-2xl steel-plate p-5">
        <p className="pass-title mb-3 text-[13px] text-ink">{editId ? 'Editar especial' : 'Nuevo especial'}</p>
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-[12px] text-ink-2">Nombre *
            <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inp} placeholder="Ceviche de rocoto" /></label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-2">Precio ({currencySymbol()})
            <input value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} inputMode="decimal" className={inp} placeholder="16.00" /></label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-2">Temperatura
            <select value={form.temperatura} onChange={(e) => setForm({ ...form, temperatura: e.target.value })} className={inp}>{TEMP_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-2">Categoría
            <select value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })} className={inp}>{CAT_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-2">Formato
            <select value={form.formato} onChange={(e) => setForm({ ...form, formato: e.target.value })} className={inp}>{FORMATO_OPTS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select></label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-2">Ideal para (personas)
            <input value={form.para_personas} onChange={(e) => setForm({ ...form, para_personas: e.target.value })} inputMode="numeric" className={inp} placeholder="2" /></label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-2 sm:col-span-2">Descripción
            <input value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inp} placeholder="Chicharrón de calamar, rocoto…" /></label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-2 sm:col-span-2">Speech de venta (para el camarero)
            <textarea value={form.sales_pitch} onChange={(e) => setForm({ ...form, sales_pitch: e.target.value })} rows={2} className={inp} placeholder="Nuestro clásico peruano, para los que buscan algo con carácter." /></label>
          <label className="flex flex-col gap-1 text-[12px] text-ink-2">Foto (opcional)
            <input type="file" accept="image/*" onChange={(e) => setForm({ ...form, photo: e.target.files?.[0] || null })} className="text-[12px] text-ink-2" /></label>
          <label className="flex items-center gap-2 self-end text-[13px] text-ink">
            <input type="checkbox" checked={form.available} onChange={(e) => setForm({ ...form, available: e.target.checked })} className="h-4 w-4 accent-[#e0611f]" /> Disponible (visible en el QR)</label>
        </div>
        <div className="mt-3 flex gap-2">
          <button type="submit" className="inline-flex h-10 items-center gap-1.5 rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi"><Plus size={16} /> {editId ? 'Guardar cambios' : 'Añadir especial'}</button>
          {editId && <button type="button" onClick={reset} className="inline-flex h-10 items-center rounded-lg steel-plate px-4 text-sm text-ink hover:bg-white">Cancelar</button>}
        </div>
      </form>

      {/* Lista */}
      {items.length === 0 ? (
        <p className="rounded-xl border border-dashed border-steel-300 px-4 py-8 text-center text-[13px] text-ink-3">Aún no hay especiales. Añade el primero arriba.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl steel-plate">
          {items.map((it, idx) => (
            <div key={it.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 sm:px-5 ${idx ? 'border-t border-steel-200' : ''} ${it.available ? '' : 'opacity-60'}`}>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-medium text-ink">{it.name} {it.price != null && <span className="data text-ember-deep">· {money(it.price)}</span>}</p>
                <p className="truncate text-[12px] text-ink-3">{[it.temperatura, it.categoria, it.formato].filter(Boolean).join(' · ') || 'sin clasificar'}{it.para_personas ? ` · ${it.para_personas} pers.` : ''}{it.available ? '' : ' · oculto'}</p>
              </div>
              <button onClick={() => edit(it)} title="Editar" className="grid h-9 w-9 place-items-center rounded-lg steel-plate text-ink hover:bg-white"><Pencil size={15} /></button>
              <button onClick={() => remove(it)} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={15} /></button>
            </div>
          ))}
        </div>
      )}
      {msg && <p className="rounded-lg border border-steel-300 bg-white/60 px-3 py-2 text-[13px] text-ink-2">{msg}</p>}
    </div>
  )
}

export default function CartaSection() {
  const [tab, setTab] = useState('carta')
  const slug = getPublicSlug()
  return (
    <div className="pb-6">
      <div className="mb-6 inline-flex rounded-lg steel-plate p-1">
        {[['carta', 'Carta'], ['especiales', 'Especiales']].map(([id, label]) => (
          <button key={id} onClick={() => setTab(id)} className={`h-9 rounded-md px-4 text-[13px] font-medium transition-colors ${tab === id ? 'bg-soot text-cream' : 'text-ink-2 hover:text-ink'}`}>{label}</button>
        ))}
      </div>
      {tab === 'carta' ? <CartaTab slug={slug} /> : <EspecialesTab slug={slug} />}
    </div>
  )
}

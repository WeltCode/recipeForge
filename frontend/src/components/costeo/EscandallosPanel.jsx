import { useEffect, useMemo, useRef, useState } from 'react'
import {
  listEscandallos, getEscandallo, createEscandallo, updateEscandallo, deleteEscandallo,
  listInsumos, createInsumo, previewCosteo, MERMA_UNITS, eur, numTrim, foodCostColor,
} from '../../lib/costeo'
import { listRecipes, getRecipe } from '../../lib/catalog'
import { Coins, Plus, Pencil, Trash, X } from '../icons'

const norm = (s) => (s || '').trim().toLowerCase()
const dot = (v) => String(v ?? '').replace(',', '.')
const num = (v) => Number(String(v ?? '').replace(',', '.')) || 0
// Unidad base del insumo deducida de la unidad de uso de la línea.
const baseFromUnit = (u) => (['g', 'kg', 'ml', 'l', 'ud', 'pack'].includes(u) ? u : (u === 'cl' ? 'ml' : 'g'))
// Dimensión de cada unidad base y unidades compatibles (misma familia): así la
// línea nunca pide una conversión imposible (p. ej. masa↔volumen sin densidad).
const DIM_OF = { g: 'masa', kg: 'masa', ml: 'vol', l: 'vol', ud: 'count', pack: 'pack' }
const UNITS_BY_DIM = { masa: [['g', 'g'], ['kg', 'kg']], vol: [['ml', 'ml'], ['l', 'l']], count: [['ud', 'ud']], pack: [['pack', 'pack']] }
const unitsForBase = (base) => UNITS_BY_DIM[DIM_OF[base]] || MERMA_UNITS
const newLine = () => ({ component_type: 'insumo', ref: '', unit: 'g', gross: '', net: '', quantity: '' })

const EMPTY = {
  id: null, name: '', is_subrecipe: true, servings: '1',
  yield_quantity: '', yield_unit: 'g', portions: '', target_food_cost: '0.30', iva_rate: '0.10', sale_price: '',
  lines: [newLine()],
}

export default function EscandallosPanel({ canEdit }) {
  const [rows, setRows] = useState([])
  const [insumos, setInsumos] = useState([])
  const [subs, setSubs] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [editing, setEditing] = useState(false)
  const [form, setForm] = useState(EMPTY)
  const [saving, setSaving] = useState(false)
  const [importInfo, setImportInfo] = useState('')

  // Preview en vivo.
  const [preview, setPreview] = useState(null)
  const [previewErr, setPreviewErr] = useState('')
  const [status, setStatus] = useState('idle') // idle | calculando | ok | error
  const [dirty, setDirty] = useState(false)
  const seqRef = useRef(0)
  const timerRef = useRef(null)

  const load = () => {
    setLoading(true)
    listEscandallos().then((d) => { setRows(d); setError('') }).catch((e) => setError(e.message)).finally(() => setLoading(false))
  }
  const loadRefs = () => {
    listInsumos().then(setInsumos).catch(() => {})
    listEscandallos('?subrecipes=1').then(setSubs).catch(() => {})
  }
  useEffect(load, [])
  useEffect(loadRefs, [])
  useEffect(() => { listRecipes().then(setRecipes).catch(() => {}) }, [])

  // Importa los ingredientes de una receta: enlaza por nombre a un insumo
  // existente y CREA automáticamente los que falten (sin precio todavía), para
  // que todo se pueda guardar. Luego el usuario pone el precio de cada uno.
  const importFromRecipe = async (rid) => {
    if (!rid) return
    try {
      const r = await getRecipe(rid)
      let current = await listInsumos()
      const byName = () => { const m = {}; current.forEach((x) => { m[norm(x.name)] = x }); return m }
      const ings = r.ingredients || []
      let matched = 0, created = 0
      const lines = []
      for (const ing of ings) {
        let ins = byName()[norm(ing.ingredient_name)]
        if (ins) { matched += 1 } else {
          try {
            ins = await createInsumo({ name: ing.ingredient_name, base_unit: baseFromUnit(ing.unit) })
            current = [...current, ins]; created += 1
          } catch { ins = null }
        }
        const q = numTrim(ing.quantity)
        lines.push({
          component_type: 'insumo', ref: ins ? String(ins.id) : '', label: ing.ingredient_name,
          unit: ing.unit || 'g', gross: q, net: q, quantity: q,  // sin merma por defecto (bruto = neto)
        })
      }
      setInsumos(current)
      setForm((f) => ({ ...f, name: f.name || r.name, servings: String(r.servings || 1), lines: lines.length ? lines : EMPTY.lines }))
      setDirty(true)
      setImportInfo(`Importados ${ings.length} insumos de «${r.name}» (${matched} ya existían, ${created} creados). Ponles precio en «Insumos y precios» para que sumen al coste.`)
    } catch (e) { setError(e.message) }
  }

  const openNew = () => { setForm(EMPTY); setPreview(null); setPreviewErr(''); setDirty(false); setImportInfo(''); setEditing(true) }
  const openEdit = async (id) => {
    try {
      const e = await getEscandallo(id)
      setForm({
        id: e.id, name: e.name, is_subrecipe: e.is_subrecipe, servings: String(e.servings),
        yield_quantity: numTrim(e.yield_quantity), yield_unit: e.yield_unit || 'g', portions: e.portions ? String(e.portions) : '',
        target_food_cost: String(e.target_food_cost ?? '0.30'), iva_rate: String(e.iva_rate ?? '0.10'),
        sale_price: e.sale_price ?? '',
        lines: (e.lines || []).map((l) => {
          const netN = num(l.quantity), yld = num(l.cleaning_yield_override)
          return {
            component_type: l.insumo ? 'insumo' : 'subrecipe', ref: String(l.insumo || l.subrecipe),
            unit: l.unit, quantity: numTrim(l.quantity),
            net: numTrim(l.quantity), gross: yld > 0 ? numTrim((netN / yld).toFixed(4)) : numTrim(l.quantity),
          }
        }) || EMPTY.lines,
      })
      setPreview(e.breakdown && !e.breakdown.error ? e.breakdown : null)
      setPreviewErr(e.breakdown?.error || ''); setDirty(false); setEditing(true)
    } catch (err) { setError(err.message) }
  }
  const close = () => { setEditing(false); setForm(EMPTY); setPreview(null) }

  const setLine = (i, k, v) => { setForm((f) => ({ ...f, lines: f.lines.map((l, idx) => idx === i ? { ...l, [k]: v } : l) })); setDirty(true) }
  const addLine = () => { setForm((f) => ({ ...f, lines: [...f.lines, newLine()] })); setDirty(true) }
  const removeLine = (i) => { setForm((f) => { const lines = f.lines.filter((_, idx) => idx !== i); return { ...f, lines: lines.length ? lines : EMPTY.lines } }); setDirty(true) }
  const setMeta = (k, v) => { setForm((f) => ({ ...f, [k]: v })); setDirty(true) }

  // Un insumo tiene precio si su formato de referencia da coste/base.
  const insumoById = (ref) => insumos.find((x) => String(x.id) === String(ref))
  const insumoPriced = (ref) => (insumoById(ref)?.cost_per_base ?? null) != null

  // Crea el insumo de una línea importada sin enlazar y lo asigna a la línea.
  const createInsumoForLine = async (i) => {
    const l = form.lines[i]
    if (!l?.label) return
    try {
      const created = await createInsumo({ name: l.label, base_unit: baseFromUnit(l.unit) })
      setInsumos((prev) => [...prev, created])
      setForm((f) => ({ ...f, lines: f.lines.map((x, idx) => idx === i ? { ...x, ref: String(created.id) } : x) }))
      setDirty(true)
      setImportInfo(`Insumo «${l.label}» creado. Ponle un formato con precio en «Insumos y precios» para que sume al coste.`)
    } catch (e) { setError(e.message) }
  }

  const buildBody = (f) => ({
    name: f.name, is_subrecipe: f.is_subrecipe, servings: Number(f.servings) || 1,
    yield_quantity: f.is_subrecipe ? (dot(f.yield_quantity) || null) : null, yield_unit: f.yield_unit,
    portions: f.is_subrecipe && f.portions ? Number(f.portions) : null,
    target_food_cost: dot(f.target_food_cost) || '0.30', iva_rate: dot(f.iva_rate) || '0.10',
    sale_price: f.sale_price ? dot(f.sale_price) : null,
    // Entran las líneas con insumo/subreceta y cantidad. En insumos, la cantidad
    // que va al plato es el NETO y la merma se aplica como override = neto/bruto
    // (coste efectivo = bruto × coste_bruto). En subrecetas, cantidad directa.
    lines: f.lines.filter((l) => l.ref && (l.component_type === 'insumo' ? num(l.net) > 0 : num(l.quantity) > 0)).map((l, i) => {
      if (l.component_type === 'subrecipe') {
        return { subrecipe: Number(l.ref), quantity: dot(l.quantity), unit: l.unit, order: i + 1 }
      }
      const g = num(l.gross), n = num(l.net)
      const override = g > 0 && n > 0 ? Math.min(1, n / g) : null
      return { insumo: Number(l.ref), quantity: dot(l.net), unit: l.unit, cleaning_yield_override: override != null ? String(override) : null, order: i + 1 }
    }),
  })

  // Cálculo en vivo con debounce + descarte de respuestas obsoletas.
  useEffect(() => {
    if (!editing) return
    const body = buildBody(form)
    if (!body.lines.length) { setPreview(null); setPreviewErr(''); setStatus('idle'); return }
    setStatus('calculando')
    clearTimeout(timerRef.current)
    const seq = ++seqRef.current
    timerRef.current = setTimeout(() => {
      previewCosteo(body)
        .then((res) => { if (seq === seqRef.current) { setPreview(res); setPreviewErr(''); setStatus('ok') } })
        .catch((err) => { if (seq === seqRef.current) { setPreview(null); setPreviewErr(err.message); setStatus('error') } })
    }, 350)
    return () => clearTimeout(timerRef.current)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form, editing])

  const save = async () => {
    if (!form.name.trim()) { setError('Ponle un nombre.'); return }
    setSaving(true)
    try {
      const body = buildBody(form)
      if (form.id) await updateEscandallo(form.id, body)
      else await createEscandallo(body)
      setDirty(false); close(); load(); loadRefs()
    } catch (e) { setError(e.message) } finally { setSaving(false) }
  }
  const remove = async (e) => {
    if (!window.confirm(`¿Eliminar "${e.name}"?`)) return
    try { await deleteEscandallo(e.id); load(); loadRefs() } catch (err) { setError(err.message) }
  }

  const subOptions = useMemo(() => subs.filter((s) => s.id !== form.id), [subs, form.id])

  if (editing) {
    return (
      <div className="pb-6">
        <div className="mb-4 flex items-center justify-between">
          <h3 className="pass-title text-[18px] text-ink">{form.id ? 'Editar escandallo' : 'Nuevo escandallo'}</h3>
          <button onClick={close} className="text-ink-3 hover:text-ink"><X size={20} /></button>
        </div>
        {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">{error}</div>}

        <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
          {/* Formulario */}
          <div className="rounded-2xl steel-plate p-5">
            {/* Tipo de escandallo */}
            <div className="mb-3 inline-flex rounded-lg steel-plate p-1">
              {[[true, 'Producción'], [false, 'Plato de venta']].map(([v, label]) => (
                <button key={label} type="button" onClick={() => setMeta('is_subrecipe', v)} className={`h-8 rounded-md px-3 text-[12.5px] font-medium transition-colors ${form.is_subrecipe === v ? 'bg-soot text-cream' : 'text-ink-2 hover:text-ink'}`}>{label}</button>
              ))}
            </div>

            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label className="flex flex-col gap-1 text-[13px] text-ink-2 sm:col-span-2">Nombre {form.is_subrecipe ? 'de la producción' : 'del plato'} *
                <input value={form.name} onChange={(e) => setMeta('name', e.target.value)} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>

              {form.is_subrecipe ? <>
                <label className="flex flex-col gap-1 text-[13px] text-ink-2">Raciones
                  <input value={form.servings} onChange={(e) => setMeta('servings', e.target.value.replace(/[^\d]/g, ''))} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
                <label className="flex flex-col gap-1 text-[13px] text-ink-2">Peso total de producción
                  <div className="flex gap-2">
                    <input value={form.yield_quantity} onChange={(e) => setMeta('yield_quantity', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="p. ej. 1900" className="w-full rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" />
                    <select value={form.yield_unit} onChange={(e) => setMeta('yield_unit', e.target.value)} className="shrink-0 rounded-lg border border-steel-300 bg-white px-2 py-2 text-[14px] text-ink outline-none focus:border-ember/50">
                      <option value="g">g</option><option value="ml">ml</option><option value="ud">ud</option>
                    </select>
                  </div></label>
                <label className="flex flex-col gap-1 text-[13px] text-ink-2">Cantidad porcionada (uds)
                  <input value={form.portions} onChange={(e) => setMeta('portions', e.target.value.replace(/[^\d]/g, ''))} placeholder="p. ej. 6" className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
              </> : <>
                <label className="flex flex-col gap-1 text-[13px] text-ink-2">Raciones
                  <input value={form.servings} onChange={(e) => setMeta('servings', e.target.value.replace(/[^\d]/g, ''))} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
                <label className="flex flex-col gap-1 text-[13px] text-ink-2">Precio de venta (con IVA)
                  <input value={form.sale_price} onChange={(e) => setMeta('sale_price', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="p. ej. 20" className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
                <label className="flex flex-col gap-1 text-[13px] text-ink-2">Food cost objetivo
                  <input value={form.target_food_cost} onChange={(e) => setMeta('target_food_cost', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0.30" className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
                <label className="flex flex-col gap-1 text-[13px] text-ink-2">IVA
                  <input value={form.iva_rate} onChange={(e) => setMeta('iva_rate', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="0.10" className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[14px] text-ink outline-none focus:border-ember/50" /></label>
              </>}
            </div>

            {/* Importar de una receta existente */}
            {!form.id && recipes.length > 0 && (
              <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border border-dashed border-steel-300 bg-steel-50/70 p-3">
                <span className="text-[13px] font-medium text-ink">Importar de una receta:</span>
                <select defaultValue="" onChange={(e) => { importFromRecipe(e.target.value); e.target.value = '' }} className="rounded-lg border border-steel-300 bg-white px-3 py-2 text-[13px] text-ink outline-none focus:border-ember/50">
                  <option value="">— elige una receta —</option>
                  {recipes.map((r) => <option key={r.id} value={r.id}>{r.code} · {r.name}</option>)}
                </select>
                <span className="text-[12px] text-ink-3">trae sus insumos y cantidades; tú solo pones el precio de cada uno</span>
              </div>
            )}
            {importInfo && <p className="mt-2 text-[12px] text-ember-deep">{importInfo}</p>}

            {/* Líneas */}
            <p className="pass-title mb-2 mt-5 text-[13px] text-ink">Insumos y subrecetas</p>
            {form.lines.map((l, i) => {
              const isIns = l.component_type === 'insumo'
              const g = num(l.gross), n = num(l.net)
              const pctU = g > 0 ? (n / g * 100) : (n > 0 ? 100 : 0)
              const pctM = g > 0 ? Math.max(0, 100 - pctU) : 0
              return (
                <div key={i} className="mb-2 rounded-lg border border-steel-200 p-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <select
                      value={`${l.component_type}:${l.ref}`}
                      onChange={(e) => { const [t, id] = e.target.value.split(':'); const ins = t === 'insumo' ? insumoById(id) : null; const u = ins?.base_unit; setForm((f) => ({ ...f, lines: f.lines.map((x, idx) => idx === i ? { ...x, component_type: t, ref: id, ...(u ? { unit: u } : {}) } : x) })); setDirty(true) }}
                      className="min-w-[160px] flex-1 rounded-lg border border-steel-300 bg-white px-2 py-2 text-[13px] text-ink outline-none focus:border-ember/50">
                      <option value="insumo:">Insumo o subreceta…</option>
                      {insumos.length > 0 && <optgroup label="Insumos">{insumos.map((x) => <option key={`i${x.id}`} value={`insumo:${x.id}`}>{x.name}</option>)}</optgroup>}
                      {subOptions.length > 0 && <optgroup label="Subrecetas">{subOptions.map((x) => <option key={`s${x.id}`} value={`subrecipe:${x.id}`}>{x.name}</option>)}</optgroup>}
                    </select>
                    {!isIns && <input value={l.quantity} onChange={(e) => setLine(i, 'quantity', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="Cant." className="w-20 rounded-lg border border-steel-300 bg-white px-2 py-2 text-[13px] text-ink outline-none focus:border-ember/50" />}
                    <select value={l.unit} onChange={(e) => setLine(i, 'unit', e.target.value)} className="w-[74px] rounded-lg border border-steel-300 bg-white px-1.5 py-2 text-[13px] text-ink outline-none focus:border-ember/50">
                      {(isIns && l.ref ? unitsForBase(insumoById(l.ref)?.base_unit) : MERMA_UNITS).map(([v]) => <option key={v} value={v}>{v}</option>)}
                    </select>
                    <button onClick={() => removeLine(i)} className="grid h-9 w-9 flex-none place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={15} /></button>
                  </div>

                  {isIns && l.ref && (
                    <div className="mt-2 grid gap-2 sm:grid-cols-4">
                      <label className="flex flex-col gap-0.5 text-[11px] text-ink-2">Peso bruto (comprado)
                        <input value={l.gross} onChange={(e) => setLine(i, 'gross', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="p. ej. 1000" className="rounded-lg border border-steel-300 bg-white px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-ink-2">Peso neto (utilizado)
                        <input value={l.net} onChange={(e) => setLine(i, 'net', e.target.value.replace(/[^\d.,]/g, ''))} placeholder="p. ej. 800" className="rounded-lg border border-steel-300 bg-white px-2.5 py-1.5 text-[13px] text-ink outline-none focus:border-ember/50" /></label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-ink-3">% utilizado (auto)
                        <input readOnly value={g > 0 ? numTrim(pctU.toFixed(2)) : ''} className="rounded-lg border border-steel-200 bg-steel-100 px-2.5 py-1.5 text-[13px] text-ink-2 outline-none" /></label>
                      <label className="flex flex-col gap-0.5 text-[11px] text-ink-3">% mermado (auto)
                        <input readOnly value={g > 0 ? numTrim(pctM.toFixed(2)) : ''} className="rounded-lg border border-steel-200 bg-steel-100 px-2.5 py-1.5 text-[13px] text-ink-2 outline-none" /></label>
                    </div>
                  )}

                  {l.label && !l.ref && (
                    <div className="mt-1 flex flex-wrap items-center gap-2 pl-0.5">
                      <span className="text-[11px] text-warn">Importado «{l.label}»: no existe como insumo.</span>
                      {canEdit && <button onClick={() => createInsumoForLine(i)} className="inline-flex items-center gap-1 rounded-md steel-plate px-2 py-0.5 text-[11px] font-medium text-ink hover:bg-white"><Plus size={12} /> Crear insumo «{l.label}»</button>}
                    </div>
                  )}
                  {isIns && l.ref && !insumoPriced(l.ref) && (
                    <p className="mt-1 pl-0.5 text-[11px] text-warn">«{insumoById(l.ref)?.name}» aún no tiene precio — añade un formato en «Insumos y precios» para que sume.</p>
                  )}
                </div>
              )
            })}
            <button onClick={addLine} className="mt-1 inline-flex items-center gap-1.5 rounded-lg steel-plate px-3 py-1.5 text-[13px] font-medium text-ink hover:bg-white"><Plus size={15} /> Añadir línea</button>

            <div className="mt-5 flex items-center gap-2">
              <button disabled={saving} onClick={save} className="inline-flex h-10 items-center rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi disabled:opacity-60">{saving ? 'Guardando…' : 'Guardar escandallo'}</button>
              <button onClick={close} className="inline-flex h-10 items-center rounded-lg steel-plate px-4 text-sm font-medium text-ink hover:bg-white">Cancelar</button>
              <span className="ml-auto text-[12px] text-ink-3">
                {status === 'calculando' ? 'Calculando…' : dirty ? 'Sin guardar' : (form.id ? 'Guardado' : '')}
              </span>
            </div>
          </div>

          {/* Desglose en vivo */}
          <div className="rounded-2xl hot-zone p-5 text-cream shadow-[var(--shadow-forge)]">
            <p className="pass-title text-[12px] tracking-[0.14em] text-cream-dim">Coste (en vivo)</p>
            {previewErr ? (
              <p className="mt-3 text-[13px] text-ember-hi">{previewErr}</p>
            ) : preview ? (
              <div className="mt-3 space-y-2.5">
                {(preview.lines || []).map((ln, idx) => (
                  <div key={idx} className="flex items-baseline justify-between gap-3 border-b border-white/10 pb-1.5">
                    <span className="min-w-0 truncate text-[12.5px] text-cream-dim">{ln.name} <span className="data text-[11px] opacity-70">{numTrim(ln.quantity)} {ln.unit}</span></span>
                    <span className={`data shrink-0 text-[13px] ${ln.incomplete ? 'text-ember-hi' : 'text-cream'}`}>{ln.incomplete ? 'sin precio' : eur(ln.line_cost)}</span>
                  </div>
                ))}
                {preview.lines_missing > 0 && <p className="text-[11px] text-ember-hi">{preview.lines_missing} insumo(s) sin precio no suman todavía.</p>}
                <Row label="Coste total (materia prima)" value={eur(preview.total_cost)} big={preview.is_subrecipe} />
                {preview.is_subrecipe ? <>
                  {preview.cost_per_portion && <Row label="Coste por porción" value={eur(preview.cost_per_portion)} big />}
                  {preview.weight_per_portion && <Row label="Peso por porción" value={`${numTrim(preview.weight_per_portion)} ${preview.yield_unit}`} />}
                  {preview.unit_cost_base && <Row label={`Coste por ${preview.yield_unit}`} value={`${Number(preview.unit_cost_base).toFixed(4)} €`} />}
                </> : <>
                  <Row label="Coste por ración" value={eur(preview.cost_per_serving)} big />
                  <Row label="PVP sugerido (con IVA)" value={eur(preview.pvp_inc_iva)} />
                  {preview.food_cost_pct != null && (
                    <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
                      <span className="text-[13px] text-cream-dim">Food cost (con tu PVP)</span>
                      <span className={`data text-[15px] font-medium ${foodCostColor(preview.food_cost_pct)}`}>{preview.food_cost_pct}%</span>
                    </div>
                  )}
                  {preview.margin != null && (
                    <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
                      <span className="text-[13px] text-cream-dim">Ganancia por ración</span>
                      <span className={`data text-[15px] font-medium ${Number(preview.margin) >= 0 ? 'text-ok' : 'text-danger'}`}>{eur(preview.margin)} · {preview.margin_pct}%</span>
                    </div>
                  )}
                </>}
              </div>
            ) : (
              <p className="mt-3 text-[13px] text-cream-dim">Añade insumos con formato de precio para ver el coste al instante.</p>
            )}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="pb-6">
      <div className="mb-4 flex items-center justify-between">
        <p className="text-sm text-ink-2">Coste de materia prima por plato o subreceta, con conversión de unidades, merma, IVA y PVP.</p>
        {canEdit && <button onClick={openNew} className="inline-flex h-10 shrink-0 items-center gap-2 rounded-lg bg-ember px-4 text-sm font-medium text-cream hover:bg-ember-hi"><Plus size={16} /> Nuevo escandallo</button>}
      </div>
      {error && <div className="mb-4 rounded-lg border border-danger/30 bg-danger/8 px-4 py-2.5 text-[13px] text-danger">{error}</div>}

      {loading ? <p className="text-sm text-ink-3">Cargando…</p> : rows.length ? (
        <div className="overflow-x-auto rounded-2xl steel-plate">
          <table className="w-full min-w-[760px] border-collapse">
            <thead>
              <tr className="border-b border-steel-300 text-left text-[11px] uppercase tracking-wide text-ink-3">
                <th className="p-3">Plato</th><th className="p-3 text-right">Coste total</th><th className="p-3 text-right">Coste/ración</th>
                <th className="p-3 text-right">Food cost</th><th className="p-3 text-right">PVP sug.</th>{canEdit && <th className="p-3 text-right">Acciones</th>}
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const b = e.breakdown && !e.breakdown.error ? e.breakdown : null
                return (
                  <tr key={e.id} className="border-b border-steel-200 last:border-0 hover:bg-steel-50">
                    <td className="p-3">
                      <p className="text-[14px] font-medium text-ink">{e.name}{e.is_subrecipe && <span className="ml-2 rounded-full bg-steel-200 px-2 py-0.5 text-[10px] font-semibold uppercase text-ink-2">subreceta</span>}</p>
                      <p className="text-[11px] text-ink-3">{e.servings} rac.{e.breakdown?.error ? ` · ${e.breakdown.error}` : ''}</p>
                    </td>
                    <td className="p-3 text-right"><span className="data text-[13px] text-ink">{b ? eur(b.total_cost) : '—'}</span></td>
                    <td className="p-3 text-right"><span className="data text-[13px] text-ink">{b && !e.is_subrecipe ? eur(b.cost_per_serving) : '—'}</span></td>
                    <td className={`p-3 text-right ${b ? foodCostColor(b.food_cost_pct) : ''}`}><span className="data text-[13px] font-medium">{b?.food_cost_pct != null ? `${b.food_cost_pct}%` : '—'}</span></td>
                    <td className="p-3 text-right"><span className="data text-[13px] text-ink-2">{b && !e.is_subrecipe ? eur(b.pvp_inc_iva) : '—'}</span></td>
                    {canEdit && (
                      <td className="p-3">
                        <div className="flex justify-end gap-1">
                          <button onClick={() => openEdit(e.id)} title="Editar" className="grid h-9 w-9 place-items-center rounded-lg text-ink-3 hover:bg-steel-100 hover:text-ink"><Pencil size={16} /></button>
                          <button onClick={() => remove(e)} title="Eliminar" className="grid h-9 w-9 place-items-center rounded-lg text-danger hover:bg-danger/8"><Trash size={16} /></button>
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="steel-plate grid place-items-center rounded-2xl py-16 text-center">
          <Coins size={28} className="text-ink-3" />
          <p className="pass-title mt-3 text-[18px] text-ink">Aún no hay escandallos</p>
          <p className="mt-1 text-[13px] text-ink-2">Crea uno y verás el coste, el food cost y el PVP al instante.</p>
        </div>
      )}
    </div>
  )
}

function Row({ label, value, big }) {
  return (
    <div className="flex items-baseline justify-between border-b border-white/10 pb-2">
      <span className="text-[13px] text-cream-dim">{label}</span>
      <span className={`data font-medium text-cream ${big ? 'text-[22px]' : 'text-[15px]'}`}>{value}</span>
    </div>
  )
}

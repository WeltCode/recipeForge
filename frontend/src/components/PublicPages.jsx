import { useEffect, useState } from 'react'
import { getPublicCarta, getPublicEspeciales } from '../lib/carta'
import { money } from '../lib/money'
import { AllergenIcon } from './AllergenIcon'

// Etiquetas de agrupación de especiales por temperatura.
const TEMP_GROUPS = [
  ['frio', 'Fríos'],
  ['caliente_tierra', 'Calientes · de tierra'],
  ['caliente_mar', 'Calientes · de mar'],
  ['', 'Otros especiales'],
]

function media(url) { return url || null }

// Capa de página pública (fondo cálido, sin la app; móvil primero).
function Shell({ children, restaurant }) {
  return (
    <div style={{ minHeight: '100vh', background: '#f6f1e9' }} className="text-[#2a231c]">
      <header className="mx-auto max-w-2xl px-5 pb-2 pt-8 text-center">
        {restaurant?.logo && <img src={media(restaurant.logo)} alt="" className="mx-auto mb-3 h-20 w-20 rounded-full object-contain bg-white p-1.5 shadow" />}
        <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Oswald, sans-serif', textTransform: 'uppercase' }}>{restaurant?.name}</h1>
      </header>
      <main className="mx-auto max-w-2xl px-5 pb-16">{children}</main>
      <footer className="pb-8 text-center text-[11px] text-[#a89b88]">Hecho con RecipeForge</footer>
    </div>
  )
}

function State({ children }) {
  return <div style={{ minHeight: '100vh', background: '#f6f1e9' }} className="grid place-items-center px-6 text-center text-[#7a6f60]">{children}</div>
}

// ── Carta pública ──
export function CartaPublica({ slug }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { getPublicCarta(slug).then(setData).catch(() => setError('Esta carta no está disponible.')) }, [slug])

  if (error) return <State>{error}</State>
  if (!data) return <State>Cargando carta…</State>
  const cur = data.restaurant?.currency
  return (
    <Shell restaurant={data.restaurant}>
      {data.sections.length === 0 && <p className="mt-8 text-center text-[#a89b88]">La carta está vacía por ahora.</p>}
      {data.sections.map((sec, i) => (
        <section key={i} className="mt-8">
          {sec.name && <h2 className="mb-3 border-b border-[#e2d8c8] pb-1 text-lg font-semibold uppercase tracking-wide" style={{ fontFamily: 'Oswald, sans-serif', color: '#b4531c' }}>{sec.name}</h2>}
          <ul className="space-y-4">
            {sec.items.map((it) => (
              <li key={it.id} className="flex gap-3">
                {it.photo && <img src={media(it.photo)} alt="" className="h-16 w-16 flex-none rounded-lg object-cover" />}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="font-medium">{it.name}</span>
                    {it.price != null && <span className="whitespace-nowrap font-semibold text-[#b4531c]">{money(it.price, cur)}</span>}
                  </div>
                  {it.menu_description && <p className="mt-0.5 text-[13px] text-[#7a6f60]">{it.menu_description}</p>}
                  {it.allergens?.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1">
                      {it.allergens.map((a) => <AllergenIcon key={a} id={a} size={18} />)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Shell>
  )
}

// ── Especiales públicos ──
export function EspecialesPublica({ slug }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  useEffect(() => { getPublicEspeciales(slug).then(setData).catch(() => setError('No disponible.')) }, [slug])

  if (error) return <State>{error}</State>
  if (!data) return <State>Cargando especiales…</State>
  const cur = data.restaurant?.currency
  const groups = TEMP_GROUPS
    .map(([key, label]) => [label, data.especiales.filter((e) => (e.temperatura || '') === key)])
    .filter(([, items]) => items.length > 0)

  return (
    <Shell restaurant={data.restaurant}>
      <p className="mt-1 text-center text-[13px] uppercase tracking-[0.2em] text-[#b4531c]" style={{ fontFamily: 'Oswald, sans-serif' }}>Especiales fuera de carta</p>
      {data.especiales.length === 0 && <p className="mt-8 text-center text-[#a89b88]">No hay especiales ahora mismo.</p>}
      {groups.map(([label, items]) => (
        <section key={label} className="mt-8">
          <h2 className="mb-3 border-b border-[#e2d8c8] pb-1 text-lg font-semibold uppercase tracking-wide" style={{ fontFamily: 'Oswald, sans-serif', color: '#b4531c' }}>{label}</h2>
          <ul className="space-y-4">
            {items.map((it) => (
              <li key={it.id} className="rounded-xl bg-white/70 p-4 shadow-sm">
                <div className="flex items-baseline justify-between gap-3">
                  <span className="font-semibold">{it.name}</span>
                  {it.price != null && <span className="whitespace-nowrap font-semibold text-[#b4531c]">{money(it.price, cur)}</span>}
                </div>
                {(it.categoria_display || it.formato_display || it.para_personas) && (
                  <p className="mt-1 flex flex-wrap gap-2 text-[11px] uppercase tracking-wide text-[#9a8d7a]">
                    {it.categoria_display && <span>{it.categoria_display}</span>}
                    {it.formato_display && <span>· {it.formato_display}</span>}
                    {it.para_personas ? <span>· ideal para {it.para_personas}</span> : null}
                  </p>
                )}
                {it.description && <p className="mt-1.5 text-[14px] text-[#5a5044]">{it.description}</p>}
                {it.sales_pitch && <p className="mt-1.5 text-[13px] italic text-[#7a6f60]">“{it.sales_pitch}”</p>}
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Shell>
  )
}

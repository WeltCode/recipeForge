import { useEffect, useState } from 'react'
import { getPublicCarta, getPublicEspeciales } from '../lib/carta'
import { money } from '../lib/money'
import { AllergenIcon } from './AllergenIcon'

// ── Mundo visual de la CARTA (para el comensal, no la cocina): papel cálido,
// brasa de la marca, tipografía de restaurante. Apetecible, limpio, elegante. ──
const PAPER = '#faf6ee'
const INK = '#241c15'
const INK_SOFT = '#6f6152'
const EMBER = '#bf4d1c'
const GOLD = '#c2a15a'
const serif = "'Playfair Display', Georgia, serif"
const body = "'Lora', Georgia, serif"

const TEMP_GROUPS = [
  ['frio', 'Fríos'],
  ['caliente_tierra', 'Calientes · de la tierra'],
  ['caliente_mar', 'Calientes · del mar'],
  ['', 'Otros especiales'],
]

// Estilos e interacción de la página (una sola animación de entrada, suave).
function MenuStyle() {
  return (
    <style>{`
      @keyframes rf-rise { from { opacity: 0; transform: translateY(14px) } to { opacity: 1; transform: none } }
      .rf-menu-sec { opacity: 0; animation: rf-rise .7s cubic-bezier(.2,.7,.2,1) forwards }
      @media (prefers-reduced-motion: reduce) { .rf-menu-sec { opacity: 1; animation: none } }
    `}</style>
  )
}

function Shell({ children, restaurant, tagline }) {
  return (
    <div style={{ minHeight: '100vh', background: PAPER, color: INK, fontFamily: body }}>
      <MenuStyle />
      <header className="mx-auto max-w-xl px-6 pb-4 pt-12 text-center">
        {restaurant?.logo && (
          <img src={restaurant.logo} alt="" className="mx-auto mb-5 h-24 w-24 rounded-full object-contain"
            style={{ background: '#fff', padding: 8, boxShadow: '0 14px 34px -18px rgba(36,28,21,.5)' }} />
        )}
        <h1 style={{ fontFamily: serif, fontSize: 'clamp(30px,8vw,44px)', fontWeight: 600, lineHeight: 1.05, letterSpacing: '-0.01em' }}>{restaurant?.name}</h1>
        {tagline && <p style={{ color: EMBER, fontFamily: serif, fontStyle: 'italic', fontSize: 15 }} className="mt-2">{tagline}</p>}
        <div className="mx-auto mt-5 flex items-center justify-center gap-2.5" aria-hidden>
          <span style={{ height: 1, width: 44, background: GOLD }} />
          <span style={{ width: 6, height: 6, borderRadius: 9, background: EMBER, transform: 'rotate(45deg)' }} />
          <span style={{ height: 1, width: 44, background: GOLD }} />
        </div>
      </header>
      <main className="mx-auto max-w-xl px-6 pb-20">{children}</main>
      <footer className="pb-10 text-center" style={{ color: '#b3a793', fontSize: 11, letterSpacing: '.12em' }}>
        HECHO CON RECIPEFORGE
      </footer>
    </div>
  )
}

function State({ children }) {
  return (
    <div style={{ minHeight: '100vh', background: PAPER, color: INK_SOFT, fontFamily: body }} className="grid place-items-center px-6 text-center">
      {children}
    </div>
  )
}

// Visor a pantalla completa de una foto (clic para cerrar).
function Lightbox({ src, onClose }) {
  useEffect(() => {
    if (!src) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [src, onClose])
  if (!src) return null
  return (
    <div onClick={onClose} role="dialog" aria-label="Foto del plato"
      className="fixed inset-0 z-[90] grid place-items-center p-4" style={{ background: 'rgba(20,14,9,.9)', cursor: 'zoom-out' }}>
      <img src={src} alt="" className="max-h-[92vh] max-w-full rounded-xl object-contain" style={{ boxShadow: '0 30px 80px -20px rgba(0,0,0,.7)' }} />
    </div>
  )
}

function SectionTitle({ children }) {
  return (
    <div className="mb-5 flex items-center gap-3">
      <h2 style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: INK, whiteSpace: 'nowrap' }}>{children}</h2>
      <span style={{ height: 1, flex: 1, background: 'linear-gradient(90deg,' + GOLD + '66, transparent)' }} aria-hidden />
    </div>
  )
}

function Price({ value, cur, big }) {
  if (value == null) return null
  return <span style={{ fontFamily: serif, fontSize: big ? 20 : 17, color: EMBER, fontWeight: 500, whiteSpace: 'nowrap' }}>{money(value, cur)}</span>
}

// ── Carta pública ──
export function CartaPublica({ slug }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState('')
  useEffect(() => { getPublicCarta(slug).then(setData).catch(() => setError('Esta carta no está disponible ahora mismo.')) }, [slug])

  if (error) return <State>{error}</State>
  if (!data) return <State>Cargando la carta…</State>
  const cur = data.restaurant?.currency
  return (
    <Shell restaurant={data.restaurant} tagline="Nuestra carta">
      {data.sections.length === 0 && <p className="mt-10 text-center" style={{ color: INK_SOFT }}>La carta se está preparando.</p>}
      {data.sections.map((sec, i) => (
        <section key={i} className="rf-menu-sec mb-10" style={{ animationDelay: `${i * 90}ms` }}>
          {sec.name && <SectionTitle>{sec.name}</SectionTitle>}
          <ul className="space-y-6">
            {sec.items.map((it) => (
              <li key={it.id} className="flex gap-4">
                {it.photo && (
                  <button type="button" onClick={() => setZoom(it.photo)} className="h-20 w-20 flex-none overflow-hidden rounded-xl" style={{ cursor: 'zoom-in', boxShadow: '0 10px 24px -14px rgba(36,28,21,.55)' }} aria-label={`Ampliar foto de ${it.name}`}>
                    <img src={it.photo} alt={it.name} className="h-full w-full object-cover" />
                  </button>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span style={{ fontFamily: serif, fontSize: 18, fontWeight: 600, color: INK }}>{it.name}</span>
                    <span aria-hidden style={{ flex: 1, borderBottom: `1px dotted ${GOLD}`, transform: 'translateY(-3px)' }} />
                    <Price value={it.price} cur={cur} />
                  </div>
                  {it.menu_description && <p className="mt-1" style={{ color: INK_SOFT, fontSize: 14.5, lineHeight: 1.5 }}>{it.menu_description}</p>}
                  {it.allergens?.length > 0 && (
                    <div className="mt-2 flex flex-wrap items-center gap-1.5">
                      {it.allergens.map((a) => <AllergenIcon key={a} id={a} size={18} />)}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Lightbox src={zoom} onClose={() => setZoom('')} />
    </Shell>
  )
}

// ── Especiales públicos ──
export function EspecialesPublica({ slug }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState('')
  useEffect(() => { getPublicEspeciales(slug).then(setData).catch(() => setError('No disponible ahora mismo.')) }, [slug])

  if (error) return <State>{error}</State>
  if (!data) return <State>Cargando los especiales…</State>
  const cur = data.restaurant?.currency
  const groups = TEMP_GROUPS
    .map(([key, label]) => [label, data.especiales.filter((e) => (e.temperatura || '') === key)])
    .filter(([, items]) => items.length > 0)

  return (
    <Shell restaurant={data.restaurant} tagline="Especiales fuera de carta">
      {data.especiales.length === 0 && <p className="mt-10 text-center" style={{ color: INK_SOFT }}>Hoy no hay especiales.</p>}
      {groups.map(([label, items], gi) => (
        <section key={label} className="rf-menu-sec mb-10" style={{ animationDelay: `${gi * 90}ms` }}>
          <SectionTitle>{label}</SectionTitle>
          <ul className="space-y-7">
            {items.map((it) => (
              <li key={it.id} className="overflow-hidden rounded-3xl"
                style={{ background: '#fffdf8', boxShadow: '0 22px 50px -26px rgba(36,28,21,.55)', border: '1px solid #efe6d5' }}>
                {it.photo && (
                  <button type="button" onClick={() => setZoom(it.photo)} className="block w-full overflow-hidden" style={{ cursor: 'zoom-in' }} aria-label={`Ampliar foto de ${it.name}`}>
                    <img src={it.photo} alt={it.name} className="h-64 w-full object-cover transition-transform duration-500 hover:scale-[1.03]" />
                  </button>
                )}
                <div className="p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <span style={{ fontFamily: serif, fontSize: 22, fontWeight: 600, color: INK, lineHeight: 1.15 }}>{it.name}</span>
                    <Price value={it.price} cur={cur} big />
                  </div>
                  {(it.categoria_display || it.formato_display || it.para_personas) && (
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {[it.categoria_display, it.formato_display, it.para_personas ? `ideal para ${it.para_personas}` : null].filter(Boolean).map((tag) => (
                        <span key={tag} style={{ background: '#f4ece0', color: '#7a5a3a', fontSize: 11, letterSpacing: '.04em' }} className="rounded-full px-2.5 py-0.5">{tag}</span>
                      ))}
                    </div>
                  )}
                  {it.description && <p className="mt-2.5" style={{ color: INK_SOFT, fontSize: 15, lineHeight: 1.55 }}>{it.description}</p>}
                  {it.sales_pitch && (
                    <p className="mt-3 border-t pt-3" style={{ borderColor: '#efe6d5', color: EMBER, fontFamily: serif, fontStyle: 'italic', fontSize: 15, lineHeight: 1.5 }}>
                      “{it.sales_pitch}”
                    </p>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
      <Lightbox src={zoom} onClose={() => setZoom('')} />
    </Shell>
  )
}

/*
  DIRECTION · "Marea & Brasa" — carta pública (Persuade)
  THESIS. La carta de un restaurante de cevichería + wok como pieza editorial de
  alta cocina sobre NEGRO: rechaza la carta clara con listas de texto. La comida
  es la única fuente de color; el negro la hace resaltar y antojar.
  OWN-WORLD. Fondo negro cálido (mar + carbón), oro `#c9a24b` para precios,
  filetes finos y rótulos; blanco cálido para leer con calma. Display Didone
  (Bodoni Moda) de alta costura; geométrica Jost para rótulos y descripción.
  Foto del plato como protagonista, con filete de oro y sombra real; ampliable.
  Color drenched-dark: la superficie ES negra.
  STORY. El cliente entiende que es un sitio serio y apetecible, recorre las
  fotos con calma y le entran ganas de pedir; el precio en oro no intimida.
  FIRST VIEWPORT. Portada negra centrada: logo, nombre en Didone versalitas,
  filete de oro que se dibuja al cargar, rótulo "CARTA". Debajo empiezan las
  secciones con rejilla de fotos-plato.
  FORM. Rejilla editorial de fotos-plato (carta) y stack editorial grande
  (especiales); brief-pinned, sin sorteo. Momento firmado: filetes de oro que
  se dibujan + entrada escalonada con ease-out (respeta reduced-motion).
*/
import { useEffect, useState } from 'react'
import { getPublicCarta, getPublicEspeciales } from '../lib/carta'
import { money } from '../lib/money'
import { AllergenIcon } from './AllergenIcon'
import { ALLERGENS } from '../lib/allergens'

// Tipografías (cargadas en index.html).
const DISPLAY = "'Bodoni Moda', 'Didot', Georgia, serif"
const SANS = "'Jost', 'Century Gothic', system-ui, sans-serif"

// Mundo único · negro cálido + oro + blanco. La comida pone el color.
const C = {
  bg: '#0c0e0d', bgSoft: '#111413', card: '#15191700', line: '#2b322e',
  gold: '#c9a24b', goldHi: '#e4c67c', ink: '#f2ede2', inkSoft: '#9d9482',
}

function Fonts() {
  return (
    <style>{`
      @keyframes rf-rise { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: none } }
      @keyframes rf-draw { from { transform: scaleX(0) } to { transform: scaleX(1) } }
      .rf-rise { opacity: 0; animation: rf-rise .85s cubic-bezier(.2,.7,.2,1) forwards }
      .rf-draw { transform: scaleX(0); transform-origin: center; animation: rf-draw 1.1s cubic-bezier(.2,.7,.2,1) .15s forwards }
      @media (prefers-reduced-motion: reduce) {
        .rf-rise { opacity: 1; animation: none }
        .rf-draw { transform: none; animation: none }
      }
    `}</style>
  )
}

// Visor a pantalla completa de una foto (clic o Esc para cerrar).
function Lightbox({ shot, onClose }) {
  useEffect(() => {
    if (!shot) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [shot, onClose])
  if (!shot) return null
  return (
    <div onClick={onClose} role="dialog" aria-label={shot.name ? `Foto de ${shot.name}` : 'Foto del plato'}
      className="fixed inset-0 z-[90] grid place-items-center p-4" style={{ background: 'rgba(6,7,6,.94)', cursor: 'zoom-out' }}>
      <img src={shot.src} alt={shot.name || ''} className="max-h-[92vh] max-w-3xl rounded object-contain"
        style={{ boxShadow: '0 40px 110px -30px rgba(0,0,0,.9)', border: `1px solid ${C.gold}44` }} />
    </div>
  )
}

function State({ children }) {
  return <div style={{ minHeight: '100vh', background: C.bg, color: C.inkSoft, fontFamily: SANS }}
    className="grid place-items-center px-6 text-center tracking-wide">{children}</div>
}

// Filete de oro con rombo central; se dibuja al cargar.
function GoldRule({ width = 132 }) {
  return (
    <div className="mx-auto mt-4 flex items-center justify-center gap-3 rf-draw" aria-hidden style={{ width }}>
      <span style={{ height: 1, flex: 1, background: `linear-gradient(90deg, transparent, ${C.gold})` }} />
      <span style={{ width: 6, height: 6, background: C.gold, transform: 'rotate(45deg)' }} />
      <span style={{ height: 1, flex: 1, background: `linear-gradient(90deg, ${C.gold}, transparent)` }} />
    </div>
  )
}

// Monograma de respaldo cuando un plato no tiene foto (o falla al cargar).
function Monogram({ label }) {
  return (
    <div className="grid h-full w-full place-items-center" style={{ background: '#0f1211', color: C.gold }}>
      <span style={{ fontFamily: DISPLAY, fontSize: 30, letterSpacing: '.08em', opacity: .55 }}>{(label || '·').slice(0, 2).toUpperCase()}</span>
    </div>
  )
}

// Foto de plato: filete de oro + sombra real, ampliable; si falta o falla la
// carga, cae con elegancia al monograma (nunca deja un icono de imagen rota).
function DishPhoto({ item, ratio, shadow, onZoom }) {
  const [failed, setFailed] = useState(false)
  const showImg = item.photo && !failed
  return (
    <div className="overflow-hidden rounded" style={{ aspectRatio: ratio, border: `1px solid ${C.gold}44`, boxShadow: shadow }}>
      {showImg ? (
        <button type="button" onClick={() => onZoom({ src: item.photo, name: item.name })} className="group block h-full w-full" style={{ cursor: 'zoom-in' }} aria-label={`Ampliar ${item.name}`}>
          <img src={item.photo} alt={item.name} loading="lazy" onError={() => setFailed(true)}
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
        </button>
      ) : <Monogram label={item.name} />}
    </div>
  )
}

// Alérgenos con nombre accesible (lector de pantalla + tooltip); el disco AESAN
// es solo el refuerzo visual.
function Allergens({ ids }) {
  if (!ids?.length) return null
  return (
    <ul className="mt-3 flex flex-wrap items-center gap-1.5" aria-label="Alérgenos">
      {ids.map((a) => {
        const nombre = ALLERGENS[a]?.nombre || a
        return (
          <li key={a} role="img" aria-label={nombre} title={nombre} className="inline-flex" style={{ color: C.inkSoft }}>
            <AllergenIcon id={a} size={17} />
          </li>
        )
      })}
    </ul>
  )
}

/* ════════════ CARTA — rejilla editorial de fotos-plato ════════════ */
export function CartaPublica({ slug }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(null)
  useEffect(() => { getPublicCarta(slug).then(setData).catch(() => setError('Esta carta no está disponible ahora mismo.')) }, [slug])

  if (error) return <State>{error}</State>
  if (!data) return <State>Cargando la carta…</State>
  const cur = data.restaurant?.currency
  const r = data.restaurant

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: SANS, color: C.ink }}>
      <Fonts />
      {/* Portada */}
      <header className="relative overflow-hidden px-6 pb-14 pt-16 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64"
          style={{ background: `radial-gradient(60% 100% at 50% 0%, rgba(201,162,75,.10), transparent 70%)` }} />
        <div className="relative">
          {r?.logo
            ? <img src={r.logo} alt="" className="mx-auto mb-6 h-20 w-20 rounded-full object-contain" style={{ background: '#000', padding: 8, border: `1px solid ${C.gold}55` }} />
            : <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full" style={{ border: `1px solid ${C.gold}`, color: C.gold, fontFamily: DISPLAY, fontSize: 22 }}>{(r?.name || '·').slice(0, 2)}</div>}
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 'clamp(26px,7vw,44px)', color: C.ink, lineHeight: 1.05 }}>{r?.name}</h1>
          <GoldRule />
          <p className="mt-4" style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 12.5, letterSpacing: '.42em', textTransform: 'uppercase' }}>Carta</p>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-5 pb-16 sm:px-8">
        {data.sections.length === 0 && <p className="py-16 text-center" style={{ color: C.inkSoft }}>La carta se está preparando.</p>}
        {data.sections.map((sec, i) => (
          <section key={i} className="mb-16">
            {sec.name && (
              <div className="mb-8 text-center">
                <h2 style={{ fontFamily: DISPLAY, fontStyle: 'italic', fontWeight: 500, color: C.goldHi, fontSize: 'clamp(22px,4.5vw,30px)', letterSpacing: '.02em' }}>{sec.name}</h2>
                <div className="mx-auto mt-3 rf-draw" style={{ height: 1, width: 64, background: C.gold, opacity: .7 }} />
              </div>
            )}
            <ul className="grid gap-x-8 gap-y-10 sm:grid-cols-2">
              {sec.items.map((it, j) => (
                <li key={it.id} className="rf-rise" style={{ animationDelay: `${Math.min(j, 6) * 70}ms` }}>
                  <DishPhoto item={it} ratio="3 / 2" shadow="0 22px 50px -30px rgba(0,0,0,.9)" onZoom={setZoom} />
                  <div className="mt-4 flex items-baseline gap-3">
                    <h3 className="min-w-0" style={{ fontFamily: DISPLAY, fontWeight: 500, fontSize: 18, letterSpacing: '.01em', color: C.ink }}>{it.name}</h3>
                    <span aria-hidden style={{ flex: 1, borderBottom: `1px dotted ${C.gold}`, opacity: .5, transform: 'translateY(-4px)' }} />
                    {it.price != null && <span style={{ fontFamily: DISPLAY, fontSize: 17, color: C.goldHi, fontWeight: 500, whiteSpace: 'nowrap' }}>{money(it.price, cur)}</span>}
                  </div>
                  {it.menu_description && <p className="mt-2" style={{ fontFamily: SANS, fontWeight: 300, color: C.inkSoft, fontSize: 14, lineHeight: 1.6 }}>{it.menu_description}</p>}
                  <Allergens ids={it.allergens} />
                </li>
              ))}
            </ul>
          </section>
        ))}
        <footer className="pt-6 text-center" style={{ color: '#5f5a4e', fontSize: 10.5, letterSpacing: '.34em' }}>HECHO CON RECIPEFORGE</footer>
      </main>
      <Lightbox shot={zoom} onClose={() => setZoom(null)} />
    </div>
  )
}

/* ════════════ ESPECIALES — stack editorial grande ════════════ */
export function EspecialesPublica({ slug }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(null)
  useEffect(() => { getPublicEspeciales(slug).then(setData).catch(() => setError('No disponible ahora mismo.')) }, [slug])

  if (error) return <State>{error}</State>
  if (!data) return <State>Cargando los especiales…</State>
  const cur = data.restaurant?.currency
  const r = data.restaurant
  const tag = (it) => [it.categoria_display, it.formato_display, it.para_personas ? `ideal para ${it.para_personas}` : null].filter(Boolean).join('  ·  ')

  return (
    <div style={{ background: C.bg, minHeight: '100vh', fontFamily: SANS, color: C.ink }}>
      <Fonts />
      <header className="relative overflow-hidden px-6 pb-12 pt-16 text-center">
        <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-72"
          style={{ background: `radial-gradient(65% 100% at 50% 0%, rgba(210,120,50,.14), transparent 72%)` }} />
        <div className="relative">
          {r?.logo
            ? <img src={r.logo} alt="" className="mx-auto mb-6 h-16 w-16 rounded-full object-contain" style={{ background: '#000', padding: 7, border: `1px solid ${C.gold}55` }} />
            : <div className="mx-auto mb-6 grid h-16 w-16 place-items-center rounded-full" style={{ border: `1px solid ${C.gold}`, color: C.gold, fontFamily: DISPLAY, fontSize: 22 }}>{(r?.name || '·').slice(0, 2)}</div>}
          <h1 style={{ fontFamily: DISPLAY, fontWeight: 500, letterSpacing: '.14em', textTransform: 'uppercase', fontSize: 'clamp(22px,6vw,36px)', color: C.ink }}>{r?.name}</h1>
          <p className="mt-2" style={{ fontFamily: DISPLAY, fontStyle: 'italic', color: C.goldHi, fontSize: 'clamp(24px,6vw,34px)' }}>Especiales</p>
          <GoldRule />
          <p className="mt-4" style={{ fontFamily: SANS, color: C.inkSoft, fontSize: 12, letterSpacing: '.42em', textTransform: 'uppercase' }}>Fuera de carta</p>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-5 pb-20 sm:px-6">
        {data.especiales.length === 0 && <p className="py-16 text-center" style={{ color: C.inkSoft }}>Hoy no hay especiales.</p>}
        <ul className="space-y-16">
          {data.especiales.map((it, i) => (
            <li key={it.id} className="rf-rise" style={{ animationDelay: `${Math.min(i, 6) * 80}ms` }}>
              <DishPhoto item={it} ratio="16 / 10" shadow="0 34px 80px -34px rgba(0,0,0,.92)" onZoom={setZoom} />
              <div className="mt-6 text-center">
                <h2 style={{ fontFamily: DISPLAY, fontWeight: 500, letterSpacing: '.06em', textTransform: 'uppercase', fontSize: 'clamp(20px,5vw,27px)', color: C.ink }}>{it.name}</h2>
                {tag(it) && <p className="mt-2.5" style={{ fontFamily: SANS, color: C.gold, fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase' }}>{tag(it)}</p>}
                {it.description && <p className="mx-auto mt-4 max-w-prose" style={{ fontFamily: SANS, fontWeight: 300, color: C.inkSoft, fontSize: 15.5, lineHeight: 1.65 }}>{it.description}</p>}
                {it.sales_pitch && <p className="mx-auto mt-3 max-w-prose" style={{ fontFamily: DISPLAY, fontStyle: 'italic', color: C.goldHi, fontSize: 16, lineHeight: 1.5 }}>“{it.sales_pitch}”</p>}
                {it.price != null && (
                  <div className="mt-5 flex items-center justify-center gap-3" aria-hidden={false}>
                    <span style={{ height: 1, width: 26, background: C.gold, opacity: .6 }} />
                    <span style={{ fontFamily: DISPLAY, color: C.goldHi, fontSize: 21, fontWeight: 500 }}>{money(it.price, cur)}</span>
                    <span style={{ height: 1, width: 26, background: C.gold, opacity: .6 }} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        <footer className="pt-16 text-center" style={{ color: '#5f5a4e', fontSize: 10.5, letterSpacing: '.34em' }}>HECHO CON RECIPEFORGE</footer>
      </main>
      <Lightbox shot={zoom} onClose={() => setZoom(null)} />
    </div>
  )
}

/*
  Cartas públicas con TRES diseños muy distintos, elegibles por el restaurante:
  · marea  — oscuro elegante, oro, Didone; rejilla de fotos-plato (fine dining).
  · lienzo — bistró claro y cálido (kraft), serif Lora + Bricolage; lista con
             miniatura redonda, precios en acento (mercado/bistró).
  · carbon — minimal alto contraste, condensada Oswald + mono; lista tipográfica
             con filetes finos, sin fotos grandes (urbano/moderno).
  Cada tema admite además fuente, colores de texto/acento e imagen de fondo
  propios (data.restaurant.carta_*). La foto del plato es ampliable (Lightbox).
*/
import { useEffect, useState } from 'react'
import { getPublicCarta, getPublicEspeciales } from '../lib/carta'
import { money } from '../lib/money'
import { AllergenIcon } from './AllergenIcon'
import { ALLERGENS } from '../lib/allergens'

const FONT_STACKS = {
  serif: "'Bodoni Moda', 'Playfair Display', Georgia, serif",
  sans: "'Jost', 'Inter', system-ui, sans-serif",
  mono: "'DM Mono', ui-monospace, monospace",
  script: "'Snell Roundhand', 'Brush Script MT', cursive",
}

const THEMES = {
  marea: { variant: 'marea', dark: true, bg: '#0c0e0d', ink: '#f2ede2', inkSoft: '#9d9482', accent: '#c9a24b', accentHi: '#e4c67c', line: '#2b322e', display: "'Bodoni Moda', Georgia, serif", body: "'Jost', system-ui, sans-serif", kicker: 'Carta' },
  lienzo: { variant: 'lienzo', dark: false, bg: '#f6efe0', ink: '#3a2c1c', inkSoft: '#8a7960', accent: '#c1502e', accentHi: '#a63f20', line: '#e3d6bd', display: "'Bricolage Grotesque', system-ui, sans-serif", body: "'Lora', Georgia, serif", kicker: 'Nuestra carta' },
  carbon: { variant: 'carbon', dark: false, bg: '#f3f3f1', ink: '#141414', inkSoft: '#6b6b68', accent: '#e8531f', accentHi: '#c8371a', line: '#161616', display: "'Oswald', system-ui, sans-serif", body: "'DM Mono', ui-monospace, monospace", kicker: 'Carta' },
}

// `design` = { theme, font, text_color, accent_color, bg_image, bg_fx }
export function resolveTheme(design) {
  const t = { ...(THEMES[design?.theme] || THEMES.marea) }
  if (design?.accent_color) { t.accent = design.accent_color; t.accentHi = design.accent_color }
  if (design?.text_color) t.ink = design.text_color
  if (design?.font && FONT_STACKS[design.font]) t.display = FONT_STACKS[design.font]
  t.bgImage = design?.bg_image || null
  t.bgFx = design?.bg_fx || {}
  return t
}
export { THEMES, FONT_STACKS }

function rootStyle(t) {
  // Fondo sólido del tema; si hay imagen, el root es transparente y la imagen
  // va en <BgLayer> fija detrás (z-index -1).
  return { minHeight: '100vh', fontFamily: t.body, color: t.ink, background: t.bgImage ? 'transparent' : t.bg, position: 'relative', zIndex: 0 }
}

// Imagen de fondo del restaurante: capa FIJA a pantalla (ideal para fotos
// verticales de móvil), con velo para mantener la carta legible. Evita el bug
// de background-attachment:fixed en iOS.
const FILTER_CSS = { none: '', gris: 'grayscale(1)', sepia: 'sepia(.65)', calido: 'saturate(1.35) sepia(.18)' }
function BgLayer({ t, contained = false }) {
  if (!t.bgImage) return null
  const fx = t.bgFx || {}
  const op = (fx.opacity ?? 100) / 100
  const blur = fx.blur ?? 0
  const filt = `blur(${blur}px) ${FILTER_CSS[fx.filter] || ''}`.trim()
  const veilAlpha = (fx.overlay ?? (t.dark ? 74 : 66)) / 100
  const veil = t.dark ? `rgba(8,10,9,${veilAlpha})` : `rgba(250,247,240,${veilAlpha})`
  return (
    <div aria-hidden className={`pointer-events-none ${contained ? 'absolute' : 'fixed'} inset-0`} style={{ zIndex: contained ? 0 : -1, overflow: 'hidden' }}>
      <div className="absolute inset-0" style={{ background: `url("${t.bgImage}") center center / cover no-repeat`, filter: filt, opacity: op }} />
      <div className="absolute inset-0" style={{ background: veil }} />
    </div>
  )
}

function Fonts() {
  return (
    <style>{`
      @keyframes rf-rise { from { opacity: 0; transform: translateY(16px) } to { opacity: 1; transform: none } }
      @keyframes rf-draw { from { transform: scaleX(0) } to { transform: scaleX(1) } }
      .rf-rise { opacity: 0; animation: rf-rise .8s cubic-bezier(.2,.7,.2,1) forwards }
      .rf-draw { transform: scaleX(0); transform-origin: center; animation: rf-draw 1s cubic-bezier(.2,.7,.2,1) .15s forwards }
      html { scroll-behavior: smooth }
      .rf-navscroll::-webkit-scrollbar { display: none }
      @media (prefers-reduced-motion: reduce) { html{scroll-behavior:auto} .rf-rise{opacity:1;animation:none} .rf-draw{transform:none;animation:none} }
    `}</style>
  )
}

function Lightbox({ shot, onClose, t }) {
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
        style={{ boxShadow: '0 40px 110px -30px rgba(0,0,0,.9)', border: `1px solid ${t.accent}44` }} />
    </div>
  )
}

function State({ t, children }) {
  const th = t || THEMES.marea
  return <div style={{ ...rootStyle(th), color: th.inkSoft }} className="grid place-items-center px-6 text-center tracking-wide">{children}</div>
}

function Monogram({ label, t }) {
  return (
    <div className="grid h-full w-full place-items-center" style={{ background: t.dark ? '#0f1211' : '#eadfca', color: t.accent }}>
      <span style={{ fontFamily: t.display, fontSize: 28, letterSpacing: '.08em', opacity: .6 }}>{(label || '·').slice(0, 2).toUpperCase()}</span>
    </div>
  )
}

function DishPhoto({ item, ratio, radius, t, onZoom }) {
  const [failed, setFailed] = useState(false)
  const showImg = item.photo && !failed
  return (
    <div className="overflow-hidden" style={{ aspectRatio: ratio, borderRadius: radius, border: `1px solid ${t.accent}44`, boxShadow: t.dark ? '0 22px 50px -30px rgba(0,0,0,.9)' : '0 16px 36px -22px rgba(70,45,20,.4)' }}>
      {showImg ? (
        <button type="button" onClick={() => onZoom({ src: item.photo, name: item.name })} className="group block h-full w-full" style={{ cursor: 'zoom-in' }} aria-label={`Ampliar ${item.name}`}>
          <img src={item.photo} alt={item.name} loading="lazy" onError={() => setFailed(true)} className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]" />
        </button>
      ) : <Monogram label={item.name} t={t} />}
    </div>
  )
}

function Allergens({ ids, t }) {
  if (!ids?.length) return null
  return (
    <ul className="mt-2.5 flex flex-wrap items-center gap-1.5" aria-label="Alérgenos">
      {ids.map((a) => {
        const nombre = ALLERGENS[a]?.nombre || a
        return <li key={a} role="img" aria-label={nombre} title={nombre} className="inline-flex" style={{ color: t.inkSoft }}><AllergenIcon id={a} size={17} /></li>
      })}
    </ul>
  )
}

// Cabecera de restaurante (portada) — se adapta al tema.
function Header({ t, r, kicker, sub }) {
  const initials = (r?.name || '·').slice(0, 2)
  return (
    <header className="relative overflow-hidden px-6 pb-12 pt-16 text-center">
      {t.variant === 'marea' && <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-64" style={{ background: `radial-gradient(60% 100% at 50% 0%, ${t.accent}1a, transparent 70%)` }} />}
      <div className="relative">
        {r?.logo
          ? <img src={r.logo} alt="" className="mx-auto mb-5 h-20 w-20 rounded-full object-contain" style={{ background: t.dark ? '#000' : '#fff', padding: 8, border: `1px solid ${t.accent}66` }} />
          : <div className="mx-auto mb-5 grid h-16 w-16 place-items-center rounded-full" style={{ border: `1px solid ${t.accent}`, color: t.accent, fontFamily: t.display, fontSize: 22 }}>{initials}</div>}
        <h1 style={{ fontFamily: t.display, fontWeight: t.variant === 'lienzo' ? 800 : 500, letterSpacing: t.variant === 'carbon' ? '.06em' : '.12em', textTransform: 'uppercase', fontSize: 'clamp(26px,7vw,44px)', color: t.ink, lineHeight: 1.05 }}>{r?.name}</h1>
        {sub && <p style={{ fontFamily: t.display, fontStyle: t.variant === 'carbon' ? 'normal' : 'italic', color: t.accentHi, fontSize: 'clamp(22px,6vw,32px)' }} className="mt-1">{sub}</p>}
        <div className="mx-auto mt-4 flex items-center justify-center gap-3 rf-draw" aria-hidden style={{ width: 132 }}>
          <span style={{ height: t.variant === 'carbon' ? 2 : 1, flex: 1, background: `linear-gradient(90deg, transparent, ${t.accent})` }} />
          <span style={{ width: 6, height: 6, background: t.accent, transform: 'rotate(45deg)', borderRadius: t.variant === 'lienzo' ? 8 : 0 }} />
          <span style={{ height: t.variant === 'carbon' ? 2 : 1, flex: 1, background: `linear-gradient(90deg, ${t.accent}, transparent)` }} />
        </div>
        <p className="mt-3" style={{ fontFamily: t.body, color: t.inkSoft, fontSize: 12, letterSpacing: '.4em', textTransform: 'uppercase' }}>{kicker}</p>
      </div>
    </header>
  )
}

// Navegación de secciones pegajosa (salto rápido en móvil).
function SectionNav({ t, sections }) {
  const named = sections.filter((s) => s.name)
  if (named.length < 2) return null
  return (
    <nav className="sticky top-0 z-30" style={{ background: t.dark ? 'rgba(12,14,13,.9)' : 'rgba(250,247,240,.92)', backdropFilter: 'blur(8px)', WebkitBackdropFilter: 'blur(8px)', borderBottom: `1px solid ${t.line}66` }}>
      <div className="rf-navscroll mx-auto flex max-w-5xl gap-2 overflow-x-auto px-4 py-2.5" style={{ scrollbarWidth: 'none', WebkitOverflowScrolling: 'touch' }}>
        {sections.map((s, i) => s.name ? (
          <a key={i} href={`#sec-${i}`} className="whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] font-medium transition active:scale-95" style={{ border: `1px solid ${t.accent}55`, color: t.ink, background: t.dark ? 'rgba(255,255,255,.05)' : '#fff' }}>{s.name}</a>
        ) : null)}
      </div>
    </nav>
  )
}

function SectionHead({ t, name }) {
  if (!name) return null
  if (t.variant === 'carbon') {
    return (
      <div className="mb-5" style={{ borderBottom: `3px solid ${t.line}`, paddingBottom: 8 }}>
        <h2 style={{ fontFamily: t.display, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.05em', fontSize: 'clamp(24px,6vw,34px)', color: t.ink, lineHeight: 1 }}>{name}</h2>
      </div>
    )
  }
  if (t.variant === 'lienzo') {
    return (
      <div className="mb-7">
        <h2 className="inline-block rounded-full px-4 py-1.5" style={{ fontFamily: t.display, fontWeight: 800, fontSize: 'clamp(18px,4vw,24px)', color: '#fff', background: t.accent, letterSpacing: '.01em' }}>{name}</h2>
      </div>
    )
  }
  return (
    <div className="mb-8 text-center">
      <h2 style={{ fontFamily: t.display, fontStyle: 'italic', fontWeight: 500, color: t.accentHi, fontSize: 'clamp(22px,4.5vw,30px)', letterSpacing: '.02em' }}>{name}</h2>
      <div className="mx-auto mt-3 rf-draw" style={{ height: 1, width: 64, background: t.accent, opacity: .7 }} />
    </div>
  )
}

function DishItem({ t, it, cur, onZoom, idx = 0 }) {
  const price = it.price != null ? money(it.price, cur) : null
  // ── CARBÓN — editorial brutalista: sin fotos, número de índice, nombre en
  //    mayúsculas ENORMES, filete grueso, precio en mono. Máximo contraste. ──
  if (t.variant === 'carbon') {
    return (
      <li className="rf-rise" style={{ borderTop: `2px solid ${t.line}`, padding: '16px 0' }}>
        <div className="flex items-start gap-3">
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, letterSpacing: '.12em', color: t.inkSoft, paddingTop: 6 }}>{String(idx + 1).padStart(2, '0')}</span>
          <h3 className="min-w-0 flex-1" style={{ fontFamily: t.display, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.005em', fontSize: 'clamp(21px,6.4vw,30px)', lineHeight: 1.02, color: t.ink }}>{it.name}</h3>
          {price && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 16, color: t.accent, fontWeight: 500, whiteSpace: 'nowrap', paddingTop: 4 }}>{price}</span>}
        </div>
        {it.menu_description && <p className="mt-2" style={{ fontFamily: "'DM Mono', monospace", color: t.inkSoft, fontSize: 12.5, lineHeight: 1.6, paddingLeft: 28 }}>{it.menu_description}</p>}
        <div style={{ paddingLeft: 28 }}><Allergens ids={it.allergens} t={t} /></div>
      </li>
    )
  }
  // ── LIENZO — bistró/mercado: TARJETA cálida con foto redondeada, nombre en
  //    Bricolage grueso y precio en PASTILLA de acento. Cozy y colorido. ──
  if (t.variant === 'lienzo') {
    return (
      <li className="rf-rise">
        <div className="flex items-center gap-4 rounded-3xl p-3" style={{ background: 'rgba(255,255,255,.72)', border: `1.5px solid ${t.line}`, boxShadow: '0 12px 30px -20px rgba(90,60,30,.45)' }}>
          <div className="h-[86px] w-[86px] flex-none overflow-hidden rounded-2xl">
            <DishPhoto item={it} ratio="1 / 1" radius={16} t={t} onZoom={onZoom} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <h3 className="min-w-0" style={{ fontFamily: t.display, fontWeight: 800, fontSize: 18, lineHeight: 1.12, color: t.ink }}>{it.name}</h3>
              {price && <span className="flex-none rounded-full px-3 py-1 text-[14.5px]" style={{ background: t.accent, color: '#fff', fontFamily: t.display, fontWeight: 800, whiteSpace: 'nowrap' }}>{price}</span>}
            </div>
            {it.menu_description && <p className="mt-1" style={{ fontFamily: t.body, color: t.inkSoft, fontSize: 14, lineHeight: 1.5 }}>{it.menu_description}</p>}
            <Allergens ids={it.allergens} t={t} />
          </div>
        </div>
      </li>
    )
  }
  // ── MAREA — fine dining cinematográfico: FOTO grande (protagonista), nombre
  //    Didone y precio en oro con hilo de puntos. Oscuro, elegante. ──
  return (
    <li className="rf-rise">
      <DishPhoto item={it} ratio="4 / 3" radius={6} t={t} onZoom={onZoom} />
      <div className="mt-4 flex items-baseline gap-3">
        <h3 className="min-w-0" style={{ fontFamily: t.display, fontWeight: 500, fontSize: 20, letterSpacing: '.01em', color: t.ink }}>{it.name}</h3>
        <span aria-hidden style={{ flex: 1, borderBottom: `1px dotted ${t.accent}`, opacity: .5, transform: 'translateY(-4px)' }} />
        {price && <span style={{ fontFamily: t.display, fontSize: 18, color: t.accentHi, fontWeight: 500, whiteSpace: 'nowrap' }}>{price}</span>}
      </div>
      {it.menu_description && <p className="mt-2" style={{ fontFamily: t.body, fontWeight: 300, color: t.inkSoft, fontSize: 14, lineHeight: 1.6 }}>{it.menu_description}</p>}
      <Allergens ids={it.allergens} t={t} />
    </li>
  )
}

/* ════════════ CARTA ════════════ */
export function CartaPublica({ slug }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(null)
  useEffect(() => { getPublicCarta(slug).then(setData).catch(() => setError('Esta carta no está disponible ahora mismo.')) }, [slug])

  const t = resolveTheme(data?.restaurant?.design)
  if (error) return <State t={t}>{error}</State>
  if (!data) return <State t={t}>Cargando la carta…</State>
  const cur = data.restaurant?.currency
  const gridClass = t.variant === 'marea' ? 'grid gap-x-8 gap-y-12 sm:grid-cols-2' : t.variant === 'lienzo' ? 'space-y-3.5' : 'space-y-0'

  return (
    <div style={rootStyle(t)}>
      <Fonts />
      <BgLayer t={t} />
      <Header t={t} r={data.restaurant} kicker={t.kicker} />
      <SectionNav t={t} sections={data.sections} />
      <main className={`mx-auto px-5 pb-20 pt-6 sm:px-8 ${t.variant === 'marea' ? 'max-w-5xl' : 'max-w-2xl'}`}>
        {data.sections.length === 0 && <p className="py-16 text-center" style={{ color: t.inkSoft }}>La carta se está preparando.</p>}
        {data.sections.map((sec, i) => (
          <section key={i} id={`sec-${i}`} className="mb-14" style={{ scrollMarginTop: 62 }}>
            <SectionHead t={t} name={sec.name} />
            <ul className={gridClass}>
              {sec.items.map((it, j) => <DishItem key={it.id} t={t} it={it} cur={cur} onZoom={setZoom} idx={j} />)}
            </ul>
          </section>
        ))}
        <footer className="pt-6 text-center" style={{ color: t.inkSoft, fontSize: 10.5, letterSpacing: '.34em', opacity: .7 }}>HECHO CON RECIPEFORGE</footer>
      </main>
      <Lightbox shot={zoom} onClose={() => setZoom(null)} t={t} />
    </div>
  )
}

/* ════════════ ESPECIALES ════════════ */
export function EspecialesPublica({ slug }) {
  const [data, setData] = useState(null)
  const [error, setError] = useState('')
  const [zoom, setZoom] = useState(null)
  useEffect(() => { getPublicEspeciales(slug).then(setData).catch(() => setError('No disponible ahora mismo.')) }, [slug])

  const t = resolveTheme(data?.restaurant?.design)
  if (error) return <State t={t}>{error}</State>
  if (!data) return <State t={t}>Cargando los especiales…</State>
  const cur = data.restaurant?.currency
  const tag = (it) => [it.categoria_display, it.formato_display, it.para_personas ? `ideal para ${it.para_personas}` : null].filter(Boolean).join('  ·  ')

  return (
    <div style={rootStyle(t)}>
      <Fonts />
      <BgLayer t={t} />
      <Header t={t} r={data.restaurant} kicker="Fuera de carta" sub="Especiales" />
      <main className="mx-auto max-w-2xl px-5 pb-20 sm:px-6">
        {data.especiales.length === 0 && <p className="py-16 text-center" style={{ color: t.inkSoft }}>Hoy no hay especiales.</p>}
        <ul className="space-y-14">
          {data.especiales.map((it, i) => (
            <li key={it.id} className="rf-rise" style={{ animationDelay: `${Math.min(i, 6) * 80}ms` }}>
              {t.variant !== 'carbon' && <DishPhoto item={it} ratio="16 / 10" radius={t.variant === 'lienzo' ? 18 : 4} t={t} onZoom={setZoom} />}
              <div className={`${t.variant === 'carbon' ? '' : 'mt-6'} text-center`}>
                <h2 style={{ fontFamily: t.display, fontWeight: t.variant === 'lienzo' ? 800 : 500, letterSpacing: t.variant === 'carbon' ? '.04em' : '.06em', textTransform: 'uppercase', fontSize: 'clamp(20px,5vw,27px)', color: t.ink }}>{it.name}</h2>
                {tag(it) && <p className="mt-2.5" style={{ fontFamily: t.body, color: t.accent, fontSize: 11.5, letterSpacing: '.2em', textTransform: 'uppercase' }}>{tag(it)}</p>}
                {it.description && <p className="mx-auto mt-4 max-w-prose" style={{ fontFamily: t.body, fontWeight: 300, color: t.inkSoft, fontSize: 15.5, lineHeight: 1.65 }}>{it.description}</p>}
                {it.sales_pitch && <p className="mx-auto mt-3 max-w-prose" style={{ fontFamily: t.display, fontStyle: t.variant === 'carbon' ? 'normal' : 'italic', color: t.accentHi, fontSize: 16, lineHeight: 1.5 }}>“{it.sales_pitch}”</p>}
                {it.price != null && (
                  <div className="mt-5 flex items-center justify-center gap-3">
                    <span style={{ height: 1, width: 26, background: t.accent, opacity: .6 }} />
                    <span style={{ fontFamily: t.variant === 'carbon' ? "'DM Mono', monospace" : t.display, color: t.accentHi, fontSize: 21, fontWeight: t.variant === 'lienzo' ? 800 : 500 }}>{money(it.price, cur)}</span>
                    <span style={{ height: 1, width: 26, background: t.accent, opacity: .6 }} />
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
        <footer className="pt-16 text-center" style={{ color: t.inkSoft, fontSize: 10.5, letterSpacing: '.34em', opacity: .7 }}>HECHO CON RECIPEFORGE</footer>
      </main>
      <Lightbox shot={zoom} onClose={() => setZoom(null)} t={t} />
    </div>
  )
}

/* ════════════ VISTA PREVIA en vivo (para el panel de gestión) ════════════ */
const PREVIEW_SAMPLE = [
  { id: 'p1', name: 'Ceviche de la casa', price: '14.50', menu_description: 'Corvina, leche de tigre, cebolla morada y cancha.', allergens: ['pescado'] },
  { id: 'p2', name: 'Tiradito nikkei', price: '16.00', menu_description: 'Pescado del día, ají amarillo y cítricos.', allergens: ['pescado', 'soja'] },
  { id: 'p3', name: 'Causa limeña', price: '11.00', menu_description: 'Patata amarilla, palta y mayonesa de ají.', allergens: ['huevos'] },
]

export function CartaPreview({ design, restaurantName, logo, surface = 'carta' }) {
  const t = resolveTheme(design)
  const r = { name: restaurantName || 'Tu restaurante', logo: logo || null }
  const isEsp = surface === 'especiales'
  return (
    <div className="rf-navscroll relative mx-auto shadow-2xl" style={{ width: 300, height: 500, overflowY: 'auto', overflowX: 'hidden', borderRadius: 26, border: '7px solid #16130f', background: t.bg, color: t.ink, fontFamily: t.body }}>
      <Fonts />
      <BgLayer t={t} contained />
      <div style={{ position: 'relative', zIndex: 1 }}>
        <Header t={t} r={r} kicker={isEsp ? 'Fuera de carta' : t.kicker} sub={isEsp ? 'Especiales' : null} />
        <div style={{ padding: '0 18px 26px' }}>
          {!isEsp && <SectionHead t={t} name="Entrantes" />}
          <ul className={t.variant === 'marea' ? 'grid gap-6' : t.variant === 'lienzo' ? 'space-y-3' : 'space-y-0'}>
            {PREVIEW_SAMPLE.map((it, j) => <DishItem key={it.id} t={t} it={it} cur="EUR" onZoom={() => {}} idx={j} />)}
          </ul>
        </div>
      </div>
    </div>
  )
}

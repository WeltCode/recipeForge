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

function resolveTheme(r) {
  const t = { ...(THEMES[r?.carta_theme] || THEMES.marea) }
  if (r?.carta_accent_color) { t.accent = r.carta_accent_color; t.accentHi = r.carta_accent_color }
  if (r?.carta_text_color) t.ink = r.carta_text_color
  if (r?.carta_font && FONT_STACKS[r.carta_font]) t.display = FONT_STACKS[r.carta_font]
  t.bgImage = r?.carta_bg_image || null
  return t
}

function rootStyle(t) {
  // Fondo sólido del tema; si hay imagen, el root es transparente y la imagen
  // va en <BgLayer> fija detrás (z-index -1).
  return { minHeight: '100vh', fontFamily: t.body, color: t.ink, background: t.bgImage ? 'transparent' : t.bg, position: 'relative', zIndex: 0 }
}

// Imagen de fondo del restaurante: capa FIJA a pantalla (ideal para fotos
// verticales de móvil), con velo para mantener la carta legible. Evita el bug
// de background-attachment:fixed en iOS.
function BgLayer({ t }) {
  if (!t.bgImage) return null
  const veil = t.dark ? 'rgba(8,10,9,.74)' : 'rgba(250,247,240,.66)'
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0" style={{ zIndex: -1 }}>
      <div className="absolute inset-0" style={{ background: `url("${t.bgImage}") center center / cover no-repeat` }} />
      <div className="absolute inset-0" style={{ background: `linear-gradient(${veil}, ${veil})` }} />
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
      <div className="mb-6 flex items-end gap-3">
        <h2 style={{ fontFamily: t.display, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '.06em', fontSize: 'clamp(20px,4vw,28px)', color: t.ink, lineHeight: 1 }}>{name}</h2>
        <span className="mb-1 flex-1" style={{ borderBottom: `2px solid ${t.line}` }} />
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

function DishItem({ t, it, cur, onZoom }) {
  const price = it.price != null ? money(it.price, cur) : null
  // CARBÓN — fila tipográfica, sin foto grande, alto contraste.
  if (t.variant === 'carbon') {
    return (
      <li className="rf-rise" style={{ borderBottom: `1px solid ${t.line}22`, paddingBottom: 14, marginBottom: 14 }}>
        <div className="flex items-baseline gap-3">
          <h3 className="min-w-0" style={{ fontFamily: t.display, fontWeight: 500, textTransform: 'uppercase', letterSpacing: '.03em', fontSize: 17, color: t.ink }}>{it.name}</h3>
          <span aria-hidden style={{ flex: 1, borderBottom: `1px dotted ${t.inkSoft}`, opacity: .6, transform: 'translateY(-4px)' }} />
          {price && <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 15, color: t.accent, fontWeight: 500, whiteSpace: 'nowrap' }}>{price}</span>}
        </div>
        {it.menu_description && <p className="mt-1.5" style={{ fontFamily: t.body, color: t.inkSoft, fontSize: 13, lineHeight: 1.5 }}>{it.menu_description}</p>}
        <Allergens ids={it.allergens} t={t} />
      </li>
    )
  }
  // LIENZO — fila cálida con miniatura redonda.
  if (t.variant === 'lienzo') {
    return (
      <li className="rf-rise flex items-start gap-4" style={{ padding: '12px 0', borderBottom: `1px dashed ${t.line}` }}>
        <div className="h-[76px] w-[76px] flex-none overflow-hidden rounded-full">
          <DishPhoto item={it} ratio="1 / 1" radius={999} t={t} onZoom={onZoom} />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <h3 className="min-w-0" style={{ fontFamily: t.display, fontWeight: 700, fontSize: 17.5, color: t.ink }}>{it.name}</h3>
            <span aria-hidden style={{ flex: 1, borderBottom: `2px dotted ${t.accent}`, opacity: .5, transform: 'translateY(-4px)' }} />
            {price && <span style={{ fontFamily: t.display, fontSize: 17, color: t.accent, fontWeight: 800, whiteSpace: 'nowrap' }}>{price}</span>}
          </div>
          {it.menu_description && <p className="mt-1" style={{ fontFamily: t.body, color: t.inkSoft, fontSize: 14.5, lineHeight: 1.55 }}>{it.menu_description}</p>}
          <Allergens ids={it.allergens} t={t} />
        </div>
      </li>
    )
  }
  // MAREA — tarjeta de foto (rejilla).
  return (
    <li className="rf-rise">
      <DishPhoto item={it} ratio="3 / 2" radius={4} t={t} onZoom={onZoom} />
      <div className="mt-4 flex items-baseline gap-3">
        <h3 className="min-w-0" style={{ fontFamily: t.display, fontWeight: 500, fontSize: 18, letterSpacing: '.01em', color: t.ink }}>{it.name}</h3>
        <span aria-hidden style={{ flex: 1, borderBottom: `1px dotted ${t.accent}`, opacity: .5, transform: 'translateY(-4px)' }} />
        {price && <span style={{ fontFamily: t.display, fontSize: 17, color: t.accentHi, fontWeight: 500, whiteSpace: 'nowrap' }}>{price}</span>}
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

  const t = resolveTheme(data?.restaurant)
  if (error) return <State t={t}>{error}</State>
  if (!data) return <State t={t}>Cargando la carta…</State>
  const cur = data.restaurant?.currency
  const gridClass = t.variant === 'marea' ? 'grid gap-x-8 gap-y-10 sm:grid-cols-2' : 'space-y-1'

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
              {sec.items.map((it) => <DishItem key={it.id} t={t} it={it} cur={cur} onZoom={setZoom} />)}
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

  const t = resolveTheme(data?.restaurant)
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

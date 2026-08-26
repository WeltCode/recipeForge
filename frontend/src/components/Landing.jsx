// Raíz de marketing (recipeforge.es). Placeholder mientras se construye la
// landing de ventas completa (se hará con /impeccable). La app vive en
// app.recipeforge.es; la carta pública sigue en la raíz (/carta, /especiales).
const CONTACT = {
  whatsapp: '34600750758',
  email: 'weltcode@gmail.com', // luego info@recipeforge.es
}
const APP_URL = 'https://app.recipeforge.es'
const WA_URL = `https://wa.me/${CONTACT.whatsapp}?text=${encodeURIComponent('Hola, me interesa RecipeForge para mi restaurante. ¿Podemos ver una demo?')}`
const MAIL_URL = `mailto:${CONTACT.email}?subject=${encodeURIComponent('Demo RecipeForge')}&body=${encodeURIComponent('Hola, me interesa RecipeForge. Restaurante: ___  Ciudad: ___  Teléfono: ___')}`

const C = { bg: '#0e0b09', panel: '#1a1310', ember: '#e8531f', emberHi: '#ff6a2c', ink: '#f4efe8', inkSoft: '#a89f95', line: '#2b211b' }
const COND = "'Oswald', system-ui, sans-serif"
const BODY = "'Inter', system-ui, sans-serif"

export function Landing() {
  return (
    <div style={{ minHeight: '100vh', background: `radial-gradient(120% 80% at 50% -10%, ${C.panel}, ${C.bg})`, color: C.ink, fontFamily: BODY }}
      className="grid place-items-center px-6 py-16 text-center">
      <div className="w-full max-w-xl">
        <div aria-hidden className="mx-auto mb-6 grid h-14 w-14 place-items-center rounded-xl"
          style={{ background: C.ember, boxShadow: `0 16px 40px -14px ${C.ember}` }}>
          <span style={{ fontFamily: COND, fontWeight: 700, fontSize: 26, color: C.ink }}>R</span>
        </div>
        <h1 style={{ fontFamily: COND, fontWeight: 700, letterSpacing: '.02em', textTransform: 'uppercase', fontSize: 'clamp(30px,7vw,48px)', lineHeight: 1.05 }}>
          RecipeForge
        </h1>
        <p className="mx-auto mt-4 max-w-md" style={{ color: C.inkSoft, fontSize: 16, lineHeight: 1.6 }}>
          Estandariza tu cocina y controla el coste de cada plato: fichas técnicas, escandallo,
          inventario y carta digital con QR.
        </p>
        <p className="mt-2" style={{ color: C.inkSoft, fontSize: 13, letterSpacing: '.14em', textTransform: 'uppercase' }}>
          Web de ventas · próximamente
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <a href={APP_URL} style={{ background: C.ember, color: C.ink }}
            className="inline-flex h-11 items-center rounded-lg px-5 text-sm font-semibold transition hover:brightness-110">
            Acceder a la app →
          </a>
          <a href={WA_URL} target="_blank" rel="noreferrer" style={{ border: `1px solid ${C.line}`, color: C.ink }}
            className="inline-flex h-11 items-center rounded-lg px-5 text-sm font-medium transition hover:bg-white/5">
            Solicitar demo por WhatsApp
          </a>
          <a href={MAIL_URL} style={{ color: C.inkSoft }}
            className="inline-flex h-11 items-center rounded-lg px-4 text-sm underline-offset-4 hover:underline">
            Escríbenos
          </a>
        </div>

        <p className="mt-12" style={{ color: '#6b6259', fontSize: 11.5, letterSpacing: '.16em', textTransform: 'uppercase' }}>
          Powered by WeltBrave
        </p>
      </div>
    </div>
  )
}

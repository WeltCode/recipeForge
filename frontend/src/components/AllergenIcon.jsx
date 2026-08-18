// Iconos SVG de los 14 alérgenos UE (mono-color, heredan currentColor).
// Siluetas simples y reconocibles para el selector, la leyenda y la ficha.
const ICONS = {
  gluten: (
    <>
      <path d="M12 21V8" />
      <path d="M12 8c0-2 1.3-3.3 3.1-3.5-.2 1.8-1.4 3.1-3.1 3.5z" />
      <path d="M12 8c0-2-1.3-3.3-3.1-3.5.2 1.8 1.4 3.1 3.1 3.5z" />
      <path d="M12 13c0-1.8 1.3-3 3-3.2-.2 1.7-1.3 2.9-3 3.2z" />
      <path d="M12 13c0-1.8-1.3-3-3-3.2.2 1.7 1.3 2.9 3 3.2z" />
      <path d="M12 18c0-1.8 1.3-3 3-3.2-.2 1.7-1.3 2.9-3 3.2z" />
      <path d="M12 18c0-1.8-1.3-3-3-3.2.2 1.7 1.3 2.9 3 3.2z" />
    </>
  ),
  crustaceos: (
    <>
      <path d="M18 7c-4-1.5-9 .5-10 4.5-.7 3 1.5 6 5 6.5" />
      <path d="M18 7c1.2.8 1.6 2 .7 3.2" />
      <path d="M13 18c-1 .8-2.2 1-3.4.7" />
      <path d="M11 12l-2.2-1M12 13.5l-2.4-.2M13 15l-2 1" />
      <circle cx="16.6" cy="8.3" r=".7" fill="currentColor" stroke="none" />
    </>
  ),
  huevos: (
    <>
      <path d="M12 3c-3.4 0-5.8 4.2-5.8 8.2A5.8 5.8 0 0012 17a5.8 5.8 0 005.8-5.8C17.8 7.2 15.4 3 12 3z" />
      <circle cx="12" cy="12" r="2.6" fill="currentColor" stroke="none" />
    </>
  ),
  pescado: (
    <>
      <path d="M4 12c3-4.2 9-4.2 12 0-3 4.2-9 4.2-12 0z" />
      <path d="M16 12l4-2.6v5.2z" />
      <circle cx="8" cy="10.8" r=".8" fill="currentColor" stroke="none" />
    </>
  ),
  cacahuetes: (
    <g transform="rotate(24 12 12)">
      <path d="M9 5.6a3 3 0 016 0c0 1.4-.8 2.1-.8 3.6s.8 2.1.8 3.6a3 3 0 01-6 0c0-1.4.8-2.1.8-3.6S9 7 9 5.6z" />
      <path d="M10 8.8h4" />
    </g>
  ),
  soja: (
    <>
      <path d="M5 18C5 11 11 5 18 5" />
      <circle cx="8.6" cy="15.4" r="1.7" />
      <circle cx="12" cy="12" r="1.7" />
      <circle cx="15.4" cy="8.6" r="1.7" />
    </>
  ),
  lacteos: (
    <>
      <path d="M10 3h4l.4 2 1.1 2.2V19a2 2 0 01-2 2h-3a2 2 0 01-2-2V7.2L9.6 5z" />
      <path d="M9 11h6" />
    </>
  ),
  frutos_cascara: (
    <>
      <path d="M12 4c4 0 6 3.2 6 7.2 0 4.8-3 8.8-6 8.8s-6-4-6-8.8C6 7.2 8 4 12 4z" />
      <path d="M8.6 9c2.2-1.2 4.6-1.2 6.8 0" />
    </>
  ),
  apio: (
    <>
      <path d="M9 21c-1-5-1-9 0-12.5M12 21c0-5.5 0-9.5.8-13M15 21c1-4.5 1-8 .2-11.5" />
      <path d="M8.5 8.5C9.5 6.5 11 6 12.8 6.8M15.6 9.6C14.8 7.4 13 6.6 11 7.4" />
    </>
  ),
  mostaza: (
    <>
      <rect x="7.5" y="8" width="9" height="12" rx="2" />
      <path d="M9.5 8V6h5v2" />
      <rect x="9.5" y="11" width="5" height="4.5" rx="1" />
    </>
  ),
  sesamo: (
    <>
      <ellipse cx="9" cy="10" rx="1.4" ry="2.5" transform="rotate(-28 9 10)" />
      <ellipse cx="14.5" cy="9" rx="1.4" ry="2.5" transform="rotate(22 14.5 9)" />
      <ellipse cx="11.5" cy="15" rx="1.4" ry="2.5" transform="rotate(-8 11.5 15)" />
    </>
  ),
  sulfitos: (
    <>
      <path d="M10.5 3h3M11.2 3v4.5l-3.6 7.8A2 2 0 009.4 18h5.2a2 2 0 001.8-2.7l-3.6-7.8V3" />
      <circle cx="11" cy="15.5" r=".7" fill="currentColor" stroke="none" />
      <circle cx="13.4" cy="16.4" r=".55" fill="currentColor" stroke="none" />
    </>
  ),
  altramuces: (
    <>
      <path d="M12 21V10" />
      <circle cx="12" cy="4.4" r="1.5" />
      <circle cx="9.8" cy="7.2" r="1.5" />
      <circle cx="14.2" cy="7.2" r="1.5" />
      <circle cx="10.2" cy="10.2" r="1.5" />
      <circle cx="13.8" cy="10.2" r="1.5" />
    </>
  ),
  moluscos: (
    <path d="M12 6a6 6 0 106 6 4 4 0 10-4-4 2 2 0 102 2" />
  ),
}

export function AllergenIcon({ id, size = 20, className = '' }) {
  const inner = ICONS[id]
  if (!inner) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 24 24" fill="none"
      stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      {inner}
    </svg>
  )
}

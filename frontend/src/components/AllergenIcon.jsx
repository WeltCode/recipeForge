// Pictogramas de los 14 alérgenos UE al estilo oficial AESAN: símbolo de línea
// dentro de un badge circular. Mono-color (heredan currentColor).
const SYMBOLS = {
  gluten: (
    <>
      <path d="M16 25.5V11" />
      <path d="M16 13c0-2.3 1.6-3.9 3.9-4-.2 2.2-1.7 3.7-3.9 4z" />
      <path d="M16 13c0-2.3-1.6-3.9-3.9-4 .2 2.2 1.7 3.7 3.9 4z" />
      <path d="M16 17.6c0-2.3 1.6-3.9 3.9-4-.2 2.2-1.7 3.7-3.9 4z" />
      <path d="M16 17.6c0-2.3-1.6-3.9-3.9-4 .2 2.2 1.7 3.7 3.9 4z" />
      <path d="M16 22.2c0-2.3 1.6-3.9 3.9-4-.2 2.2-1.7 3.7-3.9 4z" />
      <path d="M16 22.2c0-2.3-1.6-3.9-3.9-4 .2 2.2 1.7 3.7 3.9 4z" />
    </>
  ),
  crustaceos: (
    <>
      <path d="M23 10.5c-5-1.2-10 1.6-11.2 6.6-.8 3.4 1.5 6.6 5 7.3" />
      <path d="M23 10.5c1.4.9 1.9 2.4.8 3.8" />
      <path d="M16.8 24.4c-1.3 1-2.8 1.2-4.3.8" />
      <path d="M14 16.5l-2.8-1.3M15 18.6l-3-.3M16 20.6l-2.6 1.3" />
      <circle cx="21.4" cy="12" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  huevos: (
    <>
      <path d="M16 7.5c-4.3 0-7.2 5.2-7.2 9.9A7.2 7.2 0 0016 24.5a7.2 7.2 0 007.2-7.1c0-4.7-2.9-9.9-7.2-9.9z" />
      <circle cx="16" cy="17.2" r="3.1" fill="currentColor" stroke="none" />
    </>
  ),
  pescado: (
    <>
      <path d="M6.5 16c3.6-4.8 10.4-4.8 14 0-3.6 4.8-10.4 4.8-14 0z" />
      <path d="M20.5 16L25.5 12.7v6.6z" />
      <circle cx="11" cy="14.4" r="1" fill="currentColor" stroke="none" />
    </>
  ),
  cacahuetes: (
    <g transform="rotate(22 16 16)">
      <path d="M12.4 12a3.6 3.6 0 017.2 0c0 1.4-.9 2.2-.9 3.6 0 1.7 1 2.5 1 4.2a3.8 3.8 0 01-7.6 0c0-1.7 1-2.5 1-4.2 0-1.4-.7-2.2-.7-3.6z" />
      <path d="M12.8 15.6h6.4" />
      <path d="M12.9 19.6c1.9.7 4.3.7 6.2 0" />
    </g>
  ),
  soja: (
    <>
      <path d="M9 23C9 14.7 15.2 8.5 23.5 8.5" />
      <ellipse cx="12.6" cy="19.4" rx="2.1" ry="2.4" transform="rotate(-45 12.6 19.4)" />
      <ellipse cx="16" cy="16" rx="2.1" ry="2.4" transform="rotate(-45 16 16)" />
      <ellipse cx="19.4" cy="12.6" rx="2.1" ry="2.4" transform="rotate(-45 19.4 12.6)" />
    </>
  ),
  lacteos: (
    <>
      <path d="M13 8.5h6v2.4l1.4 2.5V24a1.5 1.5 0 01-1.5 1.5h-5.8A1.5 1.5 0 0111.6 24V13.4L13 10.9z" />
      <path d="M11.6 15.4h8.8" />
    </>
  ),
  frutos_cascara: (
    <>
      <path d="M16 8c4.4 0 6.7 3.6 6.7 8 0 5.2-3.3 9.7-6.7 9.7S9.3 21.2 9.3 16C9.3 11.6 11.6 8 16 8z" />
      <path d="M11.2 13c3-1.5 6.6-1.5 9.6 0" />
      <path d="M16 13v12.5" opacity=".6" />
    </>
  ),
  apio: (
    <>
      <path d="M12.4 26c-1-5.7-1-9.9 0-13.5M16 26c0-6.2 0-10.9.9-14.6M19.6 26c1-5.2 1-9 .1-13" />
      <path d="M11.3 12C12.6 9.6 14.6 9 16.7 10M20.8 13.2C19.8 10.6 17.8 9.7 15.5 10.6" />
    </>
  ),
  mostaza: (
    <>
      <rect x="10.5" y="12" width="11" height="13" rx="2.2" />
      <path d="M13 12v-2.2h6V12" />
      <rect x="12.8" y="15.4" width="6.4" height="6.2" rx="1" />
    </>
  ),
  sesamo: (
    <>
      <ellipse cx="12" cy="14" rx="1.8" ry="3.1" transform="rotate(-28 12 14)" />
      <ellipse cx="20" cy="12.6" rx="1.8" ry="3.1" transform="rotate(24 20 12.6)" />
      <ellipse cx="15.8" cy="20.4" rx="1.8" ry="3.1" transform="rotate(-8 15.8 20.4)" />
    </>
  ),
  sulfitos: (
    <text x="16" y="20" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontWeight="700" fontSize="10" fill="currentColor" stroke="none">SO₂</text>
  ),
  altramuces: (
    <>
      <path d="M16 26V13.5" />
      <circle cx="16" cy="7.4" r="2" fill="currentColor" stroke="none" />
      <circle cx="12.6" cy="10.8" r="2" fill="currentColor" stroke="none" />
      <circle cx="19.4" cy="10.8" r="2" fill="currentColor" stroke="none" />
      <circle cx="13.2" cy="14.4" r="2" fill="currentColor" stroke="none" />
      <circle cx="18.8" cy="14.4" r="2" fill="currentColor" stroke="none" />
    </>
  ),
  moluscos: (
    <path d="M16 8a8 8 0 108 8 5.3 5.3 0 10-5.3-5.3 2.7 2.7 0 102.7 2.7" />
  ),
}

export function AllergenIcon({ id, size = 24, className = '' }) {
  const symbol = SYMBOLS[id]
  if (!symbol) return null
  return (
    <svg
      width={size} height={size} viewBox="0 0 32 32" fill="none"
      stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"
      className={className} aria-hidden="true"
    >
      <circle cx="16" cy="16" r="14.6" strokeWidth="1.4" />
      {symbol}
    </svg>
  )
}

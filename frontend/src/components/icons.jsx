// Iconos SVG originales de RecipeForge — trazo redondeado, coherentes entre sí.
// Todos heredan el color con currentColor y aceptan className / size.

const base = {
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 1.6,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
}

function Svg({ size = 24, className = '', children, filled = false, ...rest }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      className={className}
      {...(filled ? { fill: 'currentColor', stroke: 'none' } : base)}
      {...rest}
    >
      {children}
    </svg>
  )
}

export const Flame = (p) => (
  <Svg {...p}>
    <path d="M12 2.5c1.5 2.5.5 4.3-.8 5.8C9.7 10 8 11.4 8 14a4 4 0 0 0 8 0c0-1.3-.5-2.4-1.2-3.3.9.3 1.7 1 2.2 2C17.7 12.9 18 14 18 15a6 6 0 0 1-12 0c0-3.2 2.3-4.8 3.7-6.6C10.8 6.9 11.8 5.2 12 2.5z" />
  </Svg>
)

export const ChefHat = (p) => (
  <Svg {...p}>
    <path d="M7.5 14.6V19a1 1 0 0 0 1 1h7a1 1 0 0 0 1-1v-4.4" />
    <path d="M8.2 14.6c-1.9 0-3.2-1.5-3.2-3.3 0-1.7 1.4-3 3.1-3 .2-2 1.9-3.5 4.2-3.5 2.3 0 4 1.5 4.2 3.5 1.7 0 3.1 1.3 3.1 3 0 1.8-1.3 3.3-3.2 3.3" />
    <path d="M9.6 16.7h4.8" />
  </Svg>
)

export const Whisk = (p) => (
  <Svg {...p}>
    <path d="M12 2.8v5.4" />
    <path d="M8.4 8.2h7.2l-.9 6.6a2.7 2.7 0 0 1-5.4 0z" />
    <path d="M10.4 8.2 11 15.4M13.6 8.2 13 15.4M12 8.2v7.2" />
    <path d="M12 17.6V21" />
  </Svg>
)

export const Cloche = (p) => (
  <Svg {...p}>
    <path d="M3.5 18.5h17" />
    <path d="M5 18.5a7 7 0 0 1 14 0" />
    <path d="M12 8.4V6.6" />
    <circle cx="12" cy="5.4" r="1.1" />
  </Svg>
)

export const Book = (p) => (
  <Svg {...p}>
    <path d="M5 4.5h10.5a2 2 0 0 1 2 2v13H7a2 2 0 0 1-2-2z" />
    <path d="M5 17.5a2 2 0 0 1 2-2h10.5" />
    <path d="M8.5 8.5h6M8.5 11.5h4" />
  </Svg>
)

export const User = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="8" r="3.3" />
    <path d="M5.5 19.5a6.5 6.5 0 0 1 13 0" />
  </Svg>
)

export const Lock = (p) => (
  <Svg {...p}>
    <rect x="5" y="10.4" width="14" height="9.6" rx="2.2" />
    <path d="M8 10.4V8a4 4 0 0 1 8 0v2.4" />
    <circle cx="12" cy="14.8" r="1.25" />
    <path d="M12 16v1.6" />
  </Svg>
)

export const Eye = (p) => (
  <Svg {...p}>
    <path d="M2.5 12S6 5.8 12 5.8 21.5 12 21.5 12 18 18.2 12 18.2 2.5 12 2.5 12z" />
    <circle cx="12" cy="12" r="2.9" />
  </Svg>
)

export const EyeOff = (p) => (
  <Svg {...p}>
    <path d="M4 4l16 16" />
    <path d="M9.8 5.2A9.3 9.3 0 0 1 12 5c6 0 9.5 7 9.5 7a16 16 0 0 1-3.2 3.9" />
    <path d="M6.4 7.4A16 16 0 0 0 2.5 12S6 19 12 19a9 9 0 0 0 3.2-.6" />
    <path d="M9.6 10.3A3 3 0 0 0 13.9 14.4" />
  </Svg>
)

export const Search = (p) => (
  <Svg {...p}>
    <circle cx="11" cy="11" r="6.4" />
    <path d="M15.8 15.8 20.5 20.5" />
  </Svg>
)

export const Plus = (p) => (
  <Svg {...p}>
    <path d="M12 5.5v13M5.5 12h13" />
  </Svg>
)

export const Pencil = (p) => (
  <Svg {...p}>
    <path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3z" />
    <path d="M14.5 7.5l2 2" />
  </Svg>
)

export const Trash = (p) => (
  <Svg {...p}>
    <path d="M4 7h16" />
    <path d="M9 7V5.6A1.6 1.6 0 0 1 10.6 4h2.8A1.6 1.6 0 0 1 15 5.6V7" />
    <path d="M6.2 7l.9 12.1A1.9 1.9 0 0 0 9 21h6a1.9 1.9 0 0 0 1.9-1.9L17.8 7" />
    <path d="M10 11v6M14 11v6" />
  </Svg>
)

export const Doc = (p) => (
  <Svg {...p}>
    <path d="M7 3.5h6.5L18 8v11.5a1 1 0 0 1-1 1H7a1 1 0 0 1-1-1v-15a1 1 0 0 1 1-1z" />
    <path d="M13 3.5V8h4.5" />
    <path d="M9 13h6M9 16h4" />
  </Svg>
)

export const LogOut = (p) => (
  <Svg {...p}>
    <path d="M14 8V6.2A2.2 2.2 0 0 0 11.8 4H6.2A2.2 2.2 0 0 0 4 6.2v11.6A2.2 2.2 0 0 0 6.2 20h5.6A2.2 2.2 0 0 0 14 17.8V16" />
    <path d="M10 12h10" />
    <path d="M17 9l3 3-3 3" />
  </Svg>
)

export const Sparkle = (p) => (
  <Svg {...p} filled>
    <path d="M12 2.6l1.7 4.6a3 3 0 0 0 1.8 1.8l4.6 1.7-4.6 1.7a3 3 0 0 0-1.8 1.8L12 18.6l-1.7-4.6a3 3 0 0 0-1.8-1.8L3.9 10.5l4.6-1.7a3 3 0 0 0 1.8-1.8z" />
  </Svg>
)

export const Clock = (p) => (
  <Svg {...p}>
    <circle cx="12" cy="12" r="8" />
    <path d="M12 7.5V12l3 1.8" />
  </Svg>
)

export const Tag = (p) => (
  <Svg {...p}>
    <path d="M4 4.5h6.5l8.4 8.4a1.8 1.8 0 0 1 0 2.6l-3.4 3.4a1.8 1.8 0 0 1-2.6 0L4 10.5z" />
    <circle cx="8" cy="8.5" r="1.2" />
  </Svg>
)

export const Grid = (p) => (
  <Svg {...p}>
    <rect x="4" y="4" width="7" height="7" rx="1.6" />
    <rect x="13" y="4" width="7" height="7" rx="1.6" />
    <rect x="4" y="13" width="7" height="7" rx="1.6" />
    <rect x="13" y="13" width="7" height="7" rx="1.6" />
  </Svg>
)

export const List = (p) => (
  <Svg {...p}>
    <path d="M8 6h12M8 12h12M8 18h12" />
    <circle cx="4" cy="6" r="1.1" />
    <circle cx="4" cy="12" r="1.1" />
    <circle cx="4" cy="18" r="1.1" />
  </Svg>
)

export const Fork = (p) => (
  <Svg {...p}>
    <path d="M7 3v4.5a2 2 0 0 0 4 0V3" />
    <path d="M9 3v18" />
    <path d="M16 3c-1.4 0-2.5 1.6-2.5 4.5S15 12 16 12s2.5-1.1 2.5-4.5S17.4 3 16 3z" />
    <path d="M16 12v9" />
  </Svg>
)

export const ArrowLeft = (p) => (
  <Svg {...p}>
    <path d="M20 12H4" />
    <path d="M10 6l-6 6 6 6" />
  </Svg>
)

export const Layers = (p) => (
  <Svg {...p}>
    <path d="M12 3.5 21 8l-9 4.5L3 8z" />
    <path d="M3 12l9 4.5L21 12" />
    <path d="M3 16l9 4.5L21 16" />
  </Svg>
)

export const X = (p) => (
  <Svg {...p}>
    <path d="M6 6l12 12M18 6 6 18" />
  </Svg>
)

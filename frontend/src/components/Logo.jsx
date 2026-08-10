import iconColor from '../assets/recipeforge-icon-color.svg'
import iconWhite from '../assets/recipeforge-icon-white.svg'

// Lockup de marca RecipeForge = ícono de la forja (SVG vectorial, nítido a
// cualquier tamaño y densidad) + wordmark en HTML. El tamaño se controla con
// una clase de font-size (text-*) en `className`; todo escala en `em`, así que
// es responsive. `variant` elige el ícono y el color de "Recipe": sobre oscuro
// = ícono de herramientas blancas + crema; sobre claro = herramientas carbón +
// carbón. "Forge" siempre en brasa. Ver LEEME de marca.
export default function Logo({ variant = 'dark', className = '' }) {
  const light = variant === 'light'
  const recipeColor = light ? '#211B19' : '#FBF6EF'
  const iconUrl = light ? iconColor : iconWhite
  return (
    <span role="img" aria-label="RecipeForge" className={`inline-flex items-center gap-[0.3em] ${className}`}>
      <img src={iconUrl} alt="" draggable="false" className="block h-[1.3em] w-auto shrink-0" />
      <span
        className="leading-none"
        style={{ fontFamily: "'Bricolage Grotesque', 'Inter', system-ui, sans-serif", fontWeight: 800, letterSpacing: '-0.02em' }}
      >
        <span style={{ color: recipeColor }}>Recipe</span><span style={{ color: '#EE5A1C' }}>Forge</span>
      </span>
    </span>
  )
}

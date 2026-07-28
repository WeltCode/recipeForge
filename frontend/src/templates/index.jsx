import TemplateFormal from './TemplateFormal'
import TemplateModerna from './TemplateModerna'
import TemplateTradicional from './TemplateTradicional'
import TemplateLlamativa from './TemplateLlamativa'

// Catálogo de plantillas. `defaultAccent` = color por defecto; `customizable` = permite elegir color.
export const TEMPLATES = [
  { id: 'formal', label: 'Formal', desc: 'Técnica y sobria, blanco y negro. Máxima legibilidad.', Component: TemplateFormal, customizable: false, defaultAccent: '#1a1a18' },
  { id: 'moderna', label: 'Moderna', desc: 'Editorial y minimalista, con acento cálido.', Component: TemplateModerna, customizable: true, defaultAccent: '#E2571E' },
  { id: 'tradicional', label: 'Tradicional', desc: 'Recetario clásico, tipografía serif y tono pergamino.', Component: TemplateTradicional, customizable: true, defaultAccent: '#9c6b3f' },
  { id: 'llamativa', label: 'Llamativa', desc: 'Póster de alto contraste, ideal para la pared en servicio.', Component: TemplateLlamativa, customizable: true, defaultAccent: '#FF5A1F' },
]

export function templateMeta(id) {
  return TEMPLATES.find((t) => t.id === id) || TEMPLATES[0]
}

const MAP = Object.fromEntries(TEMPLATES.map((t) => [t.id, t.Component]))

// Renderiza la ficha con la plantilla elegida (recipe.template), formal por defecto.
export function RecipeSheet({ recipe }) {
  const Component = MAP[recipe?.template] || TemplateFormal
  return <Component recipe={recipe} />
}

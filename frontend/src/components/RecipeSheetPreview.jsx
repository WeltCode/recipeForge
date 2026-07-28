import { RecipeSheet } from '../templates'

// Envoltorio de compatibilidad: renderiza la ficha con la plantilla elegida.
function RecipeSheetPreview({ recipe }) {
  return <RecipeSheet recipe={recipe} />
}

export default RecipeSheetPreview

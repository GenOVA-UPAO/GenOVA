import { PhasePage } from '../pages/PhasePage.jsx'
import { fetchExploreRecursos, generateExploreResource } from '../services/exploreService.js'

export function ExplorePage() {
  return (
    <PhasePage
      phase="EXPLORE"
      emoji="🔍"
      description="Interactúa con simuladores y laboratorios para construir tus propias hipótesis antes de ver la teoría formal."
      fetchRecursos={fetchExploreRecursos}
      generateResource={generateExploreResource}
    />
  )
}

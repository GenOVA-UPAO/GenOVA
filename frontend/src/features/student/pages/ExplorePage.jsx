import { PhasePage } from '@/features/ova_workspace/pages/PhasePage.jsx'
import { fetchExploreRecursos, generateExploreResource } from '@/features/ova_workspace/services/phases/exploreService.js'

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

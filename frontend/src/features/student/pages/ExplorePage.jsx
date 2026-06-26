import { PhasePage } from '@/features/ova_workspace/pages/PhasePage.jsx'
import {
  fetchPhaseRecursos,
  generatePhaseResource,
} from '@/features/ova_workspace/services/phases/phaseService'

export function ExplorePage() {
  return (
    <PhasePage
      phase="EXPLORE"
      emoji="🔍"
      description="Interactúa con simuladores y laboratorios para construir tus propias hipótesis antes de ver la teoría formal."
      fetchRecursos={() => fetchPhaseRecursos('explore')}
      generateResource={(resourceType, concept, uploadIds) =>
        generatePhaseResource('explore', resourceType, concept, uploadIds)
      }
    />
  )
}

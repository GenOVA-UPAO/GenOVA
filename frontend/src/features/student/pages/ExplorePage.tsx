import { PhasePage } from '@/features/ova_workspace/pages/PhasePage'
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
      generateResource={(resourceType: string | number, concept: string, uploadIds?: string[]) =>
        generatePhaseResource('explore', resourceType, concept, uploadIds)
      }
    />
  )
}

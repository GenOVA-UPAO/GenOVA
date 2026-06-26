import { PhasePage } from '@/features/ova_workspace/pages/PhasePage'
import {
  fetchPhaseRecursos,
  generatePhaseResource,
} from '@/features/ova_workspace/services/phases/phaseService'

export function EngagePage() {
  return (
    <PhasePage
      phase="ENGAGE"
      emoji="🎯"
      description="Selecciona un tipo de recurso, escribe el concepto de ML y genera el material con IA real."
      fetchRecursos={() => fetchPhaseRecursos('engage')}
      generateResource={(resourceType: string | number, concept: string, uploadIds?: string[]) =>
        generatePhaseResource('engage', resourceType, concept, uploadIds)
      }
    />
  )
}

import { PhasePage } from '../components/phase/PhasePage.jsx'
import { fetchEngageRecursos, generateEngageResource } from '../services/engageService.js'

export function EngagePage() {
  return (
    <PhasePage
      phase="ENGAGE"
      emoji="🎯"
      description="Selecciona un tipo de recurso, escribe el concepto de ML y genera el material con IA real."
      fetchRecursos={fetchEngageRecursos}
      generateResource={generateEngageResource}
    />
  )
}

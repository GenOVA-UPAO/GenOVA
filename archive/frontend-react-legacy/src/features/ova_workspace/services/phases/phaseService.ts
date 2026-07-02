import { apiJson } from '../../../../core/lib/http/client'
import type { Resource } from '@/features/student/lib/types'

// Las 5 fases 5E comparten exactamente el mismo contrato HTTP (`/api/agents/
// {phase}/recursos` y `/generate`). Antes vivían en 5 archivos casi idénticos
// (engageService, exploreService, …); se consolidan aquí parametrizando la fase.
export type Phase = 'engage' | 'explore' | 'explain' | 'elaborate' | 'evaluate'

export interface PhaseRecursosResponse {
  recursos?: Resource[]
}

export function fetchPhaseRecursos(phase: Phase): Promise<PhaseRecursosResponse> {
  return apiJson<PhaseRecursosResponse>(`/api/agents/${phase}/recursos`)
}

export function generatePhaseResource(
  phase: Phase,
  resource_type: string | number,
  concept: string,
  upload_ids: string[] = [],
): Promise<unknown> {
  return apiJson(`/api/agents/${phase}/generate`, {
    method: 'POST',
    body: JSON.stringify({ resource_type, concept, upload_ids }),
  })
}

import { useQuery } from '@tanstack/react-query'
import { getResourceContent } from '../../services/ovaCreationService.js'

// Carga el HTML de un recurso `done` para vista previa (B3) vía TanStack Query:
// caché/dedup (el mismo recurso se pide una vez) y el contenido es inmutable una
// vez generado, así que staleTime alto. Mantiene el shape {content,error,loading}.
export function useResourceContent(jobId, resourceId, enabled) {
  const active = Boolean(enabled && jobId && resourceId)
  const { data, error, isLoading } = useQuery({
    queryKey: ['resourceContent', jobId, resourceId],
    queryFn: () => getResourceContent(jobId, resourceId),
    enabled: active,
    staleTime: 5 * 60_000,
  })

  return {
    content: active ? (data?.content ?? null) : null,
    error: error ? error.message || 'No se pudo cargar la vista previa.' : '',
    loading: active && isLoading,
  }
}

import { useQuery } from '@tanstack/react-query'
import { getResourceContent } from '../services/ovaCreationService'

// Carga el HTML de un recurso `done` para vista previa (B3) vía TanStack Query:
// caché/dedup y contenido inmutable una vez generado (staleTime alto).
export function useResourceContent(
  jobId: string | null,
  resourceId: string | null,
  enabled?: boolean,
) {
  const active = Boolean(enabled && jobId && resourceId)
  const { data, error, isLoading } = useQuery({
    queryKey: ['resourceContent', jobId, resourceId],
    queryFn: () => getResourceContent(jobId as string, resourceId as string),
    enabled: active,
    staleTime: 5 * 60_000,
  })

  const content = (data as { content?: string } | undefined)?.content ?? null
  return {
    content: active ? content : null,
    error: error ? (error as Error).message || 'No se pudo cargar la vista previa.' : '',
    loading: active && isLoading,
  }
}

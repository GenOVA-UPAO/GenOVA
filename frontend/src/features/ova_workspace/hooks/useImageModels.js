import { useQuery } from '@tanstack/react-query'
import { getImageModels } from '../services/ovaSettingsService.js'

/**
 * Modelos de imagen disponibles para un proveedor.
 *
 * OvaSettingsCard y MediaTaskCard consultaban
 * `/api/users/me/image-models?provider=X` por separado con un useEffect cada
 * uno; al estar montados juntos disparaban dos peticiones idénticas. React
 * Query las deduplica por `queryKey` y cachea el resultado entre montajes
 * (Vercel: client-swr-dedup). `enabled` evita pedir cuando no aplica
 * (p. ej. proveedor deshabilitado).
 */
export function useImageModels(provider, enabled = true) {
  return useQuery({
    queryKey: ['image-models', provider],
    queryFn: () => getImageModels(provider),
    enabled: enabled && !!provider,
    staleTime: 5 * 60_000,
  })
}

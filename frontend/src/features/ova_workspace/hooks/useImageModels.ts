import { useQuery } from '@tanstack/react-query'
import { getImageModels } from '../services/ovaSettingsService'

/**
 * Modelos de imagen disponibles para un proveedor.
 *
 * React Query deduplica por `queryKey` y cachea el resultado entre montajes
 * (Vercel: client-swr-dedup). `enabled` evita pedir cuando no aplica.
 */
export function useImageModels(provider: string, enabled = true) {
  return useQuery({
    queryKey: ['image-models', provider],
    queryFn: () => getImageModels(provider),
    enabled: enabled && !!provider,
    staleTime: 5 * 60_000,
  })
}

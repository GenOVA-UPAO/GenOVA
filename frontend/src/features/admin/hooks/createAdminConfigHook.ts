import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

/**
 * Factory que genera un hook con el patrón estándar useQuery + useMutation
 * para un recurso de configuración admin (GET + PUT).
 *
 * @param key - React Query cache key
 * @param getter - función que obtiene la config del servidor
 * @param setter - función que guarda la config y devuelve el nuevo estado
 *
 * @example
 * const useMyConfig = createAdminConfigHook(
 *   ['admin', 'my-config'],
 *   getMyConfig,
 *   saveMyConfig,
 * )
 */
export function createAdminConfigHook<TConfig, TPayload = TConfig>(
  key: string[],
  getter: () => Promise<TConfig>,
  setter: (payload: TPayload) => Promise<TConfig>,
) {
  return function useAdminConfig() {
    const qc = useQueryClient()

    const config = useQuery({ queryKey: key, queryFn: getter })

    const save = useMutation({
      mutationFn: setter,
      onSuccess: (data) => qc.setQueryData(key, data),
    })

    return { config, save }
  }
}

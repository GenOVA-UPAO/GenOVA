import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  getAdminLlmConfig,
  saveAdminLlmConfig,
} from '../../ova_workspace/services/ovaSettingsService'
import { fetchLlmSettings } from '../../../core/services/llmSettingsService'

const CONFIG_KEY = ['admin', 'llm-config']
const CATALOG_KEY = ['admin', 'llm-catalog']

/**
 * Config admin de modelos LLM (defaults + fallback por tarea) + catálogo de
 * modelos para los selectores. La mutación de guardado cachea la respuesta.
 */
export function useAdminLlmConfig() {
  const qc = useQueryClient()

  const config = useQuery({ queryKey: CONFIG_KEY, queryFn: getAdminLlmConfig })

  const catalog = useQuery({
    queryKey: CATALOG_KEY,
    queryFn: () => fetchLlmSettings({ page_size: 500 }),
    select: (data) => (data.catalog_full ?? []).filter((m) => m.active !== false),
    staleTime: 5 * 60 * 1000,
  })

  const save = useMutation({
    mutationFn: saveAdminLlmConfig,
    onSuccess: (data) => qc.setQueryData(CONFIG_KEY, data),
  })

  return { config, catalog, save }
}

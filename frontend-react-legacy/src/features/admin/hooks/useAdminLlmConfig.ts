import { useQuery } from '@tanstack/react-query'
import { fetchLlmSettings } from '@/core/settings/services/llmSettingsService'
import {
  getAdminLlmConfig,
  saveAdminLlmConfig,
} from '../services/adminSettingsService'
import { createAdminConfigHook } from './createAdminConfigHook'

const CONFIG_KEY = ['admin', 'llm-config']
const CATALOG_KEY = ['admin', 'llm-catalog']

interface CatalogModel {
  active?: boolean
  [key: string]: unknown
}

const useAdminLlmConfigBase = createAdminConfigHook(
  CONFIG_KEY,
  getAdminLlmConfig,
  saveAdminLlmConfig,
)

/**
 * Config admin de modelos LLM (defaults + fallback por tarea) + catálogo de
 * modelos para los selectores. La mutación de guardado cachea la respuesta.
 */
export function useAdminLlmConfig() {
  const { config, save } = useAdminLlmConfigBase()

  const catalog = useQuery({
    queryKey: CATALOG_KEY,
    queryFn: () => fetchLlmSettings({ page_size: 500 }),
    select: (data) => {
      const full =
        (data as { catalog_full?: CatalogModel[] }).catalog_full ?? []
      return full.filter((m) => m.active !== false)
    },
    staleTime: 5 * 60 * 1000,
  })

  return { config, catalog, save }
}

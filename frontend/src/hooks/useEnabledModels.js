import { useCallback } from 'react'
import { toast } from 'sonner'
import { saveEnabledModels } from '../services/llmSettingsService.js'

export function useEnabledModels({ enabledModels, setEnabledModels, defaults = {} }) {
  const isDefaultModel = useCallback((provider, modelId) => {
    for (const t of Object.values(defaults)) {
      if (t.provider === provider && t.model_id === modelId) return true
    }
    return false
  }, [defaults])

  const isModelEnabled = useCallback((provider, modelId) =>
    (enabledModels || []).some((e) => e.provider === provider && e.model_id === modelId),
  [enabledModels])

  /** Toggle + auto-save immediately to Supabase. Optimistic update with revert on error. */
  const toggleFavorite = useCallback(async (provider, modelId) => {
    const current = enabledModels || []
    const exists = current.some((e) => e.provider === provider && e.model_id === modelId)
    const next = exists
      ? current.filter((e) => !(e.provider === provider && e.model_id === modelId))
      : [...current, { provider, model_id: modelId }]
    setEnabledModels(next)
    try {
      const data = await saveEnabledModels(next)
      if (Array.isArray(data?.models)) setEnabledModels(data.models)
    } catch (err) {
      setEnabledModels(current)
      toast.error(err?.message || 'No se pudo guardar el favorito.')
    }
  }, [enabledModels, setEnabledModels])

  return { isDefaultModel, isModelEnabled, toggleFavorite }
}

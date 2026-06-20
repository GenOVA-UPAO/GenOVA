import { useCallback, useState } from 'react'
import { toast } from 'sonner'
import { saveEnabledModels } from '../services/llmSettingsService.js'

export function useEnabledModels({ enabledModels, setEnabledModels, defaults = {}, onSaved }) {
  const [enabledSaving, setEnabledSaving] = useState(false)

  const isDefaultModel = useCallback((provider, modelId) => {
    for (const t of Object.values(defaults)) {
      if (t.provider === provider && t.model_id === modelId) return true
    }
    return false
  }, [defaults])

  const isModelEnabled = useCallback((provider, modelId) =>
    (enabledModels || []).some((e) => e.provider === provider && e.model_id === modelId),
  [enabledModels])

  const toggleModel = useCallback((provider, modelId) => {
    setEnabledModels((prev) => {
      const exists = (prev || []).some((e) => e.provider === provider && e.model_id === modelId)
      if (exists) return (prev || []).filter((e) => !(e.provider === provider && e.model_id === modelId))
      return [...(prev || []), { provider, model_id: modelId }]
    })
  }, [setEnabledModels])

  const saveEnabled = useCallback(async () => {
    setEnabledSaving(true)
    try {
      const data = await saveEnabledModels(enabledModels)
      if (Array.isArray(data?.models)) setEnabledModels(data.models)
      await onSaved?.()
      toast.success('Modelos habilitados actualizados.')
      return true
    } catch (err) {
      toast.error(err?.message || 'No se pudo guardar los modelos.')
      return false
    } finally {
      setEnabledSaving(false)
    }
  }, [enabledModels, setEnabledModels, onSaved])

  return { enabledSaving, isDefaultModel, isModelEnabled, toggleModel, saveEnabled }
}

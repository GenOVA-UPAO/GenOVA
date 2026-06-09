import { useCallback, useEffect, useState } from 'react'
import { toast } from 'sonner'
import { fetchLlmSettings, saveLlmSettings, saveEnabledModels } from '../services/llmSettingsService.js'

export const TASK_LABELS = {
  texto: 'Texto',
  codigo: 'Código / HTML interactivo',
  orquestador: 'Orquestador',
  razonamiento: 'Razonamiento',
}
const DEFAULT_TIMEOUT = 120

function _flatCatalog(catalog) {
  if (!catalog) return []
  if (Array.isArray(catalog)) return catalog
  const entries = []
  for (const [, models] of Object.entries(catalog)) {
    if (Array.isArray(models)) entries.push(...models)
  }
  return entries
}

/**
 * Per-user LLM settings (general config). One hook used by BOTH the workspace
 * modal and the profile page so they edit the same config. `enabled` gates the
 * initial load (e.g. only when a modal opens).
 */
export function useLlmSettings(enabled = true) {
  const [settings, setSettings] = useState(null)
  const [catalog, setCatalog] = useState({})
  const [catalogAll, setCatalogAll] = useState([])
  const [enabledModels, setEnabledModels] = useState([])
  const [defaults, setDefaults] = useState({})
  const [bounds, setBounds] = useState([30, 300])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabledSaving, setEnabledSaving] = useState(false)
  const [error, setError] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const data = await fetchLlmSettings()
      setSettings(data.settings || {})
      setCatalog(data.catalog || {})
      setCatalogAll(data.catalog_all ? Object.values(data.catalog_all) : [])
      setEnabledModels(Array.isArray(data.enabled_models) ? data.enabled_models : [])
      setDefaults(data.defaults || {})
      if (Array.isArray(data.timeout_bounds)) setBounds(data.timeout_bounds)
    } catch (err) {
      setError(err?.message || 'No se pudo cargar la configuración.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (enabled) void load()
  }, [enabled, load])

  const setModel = useCallback((tipo, provider, modelId) => {
    setSettings((s) => ({ ...s, [tipo]: { ...s[tipo], provider, model_id: modelId } }))
  }, [])

  const setTipoTimeout = useCallback((tipo, timeoutS) => {
    setSettings((s) => ({ ...s, [tipo]: { ...s[tipo], timeout_s: timeoutS } }))
  }, [])

  const resetTipo = useCallback((tipo) => {
    setSettings((s) => ({ ...s, [tipo]: { ...defaults[tipo], timeout_s: DEFAULT_TIMEOUT } }))
  }, [defaults])

  const save = useCallback(async () => {
    if (!settings) return false
    setSaving(true)
    try {
      const data = await saveLlmSettings(settings)
      if (data?.settings) setSettings(data.settings)
      toast.success('Configuración de IA guardada.')
      return true
    } catch (err) {
      toast.error(err?.message || 'No se pudo guardar la configuración.')
      return false
    } finally {
      setSaving(false)
    }
  }, [settings])

  const isDefaultModel = useCallback((provider, modelId) => {
    const d = defaults || {}
    for (const _t of Object.values(d)) {
      if (_t.provider === provider && _t.model_id === modelId) return true
    }
    return false
  }, [defaults])

  const isModelEnabled = useCallback((provider, modelId) => {
    return (enabledModels || []).some(
      (e) => e.provider === provider && e.model_id === modelId
    )
  }, [enabledModels])

  const toggleModel = useCallback((provider, modelId) => {
    setEnabledModels((prev) => {
      const exists = (prev || []).some(
        (e) => e.provider === provider && e.model_id === modelId
      )
      if (exists) {
        return (prev || []).filter(
          (e) => !(e.provider === provider && e.model_id === modelId)
        )
      }
      return [...(prev || []), { provider, model_id: modelId }]
    })
  }, [])

  const saveEnabled = useCallback(async () => {
    setEnabledSaving(true)
    try {
      const data = await saveEnabledModels(enabledModels)
      if (Array.isArray(data?.models)) setEnabledModels(data.models)
      // Reload to refresh the filtered catalog dropdowns
      await load()
      toast.success('Modelos habilitados actualizados.')
      return true
    } catch (err) {
      toast.error(err?.message || 'No se pudo guardar los modelos.')
      return false
    } finally {
      setEnabledSaving(false)
    }
  }, [enabledModels, load])

  return {
    settings, catalog, catalogAll, enabledModels, defaults, bounds,
    loading, saving, enabledSaving, error,
    load, setModel, setTipoTimeout, resetTipo, save,
    isDefaultModel, isModelEnabled, toggleModel, saveEnabled,
    taskLabels: TASK_LABELS,
    flatCatalog: useCallback(() => _flatCatalog(catalog), [catalog]),
  }
}

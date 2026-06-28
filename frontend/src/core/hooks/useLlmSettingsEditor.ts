import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useState,
} from 'react'
import { toast } from 'sonner'
import {
  addFallbackIn,
  moveFallbackIn,
  removeFallbackIn,
  resetTipoIn,
  type SettingsMap,
  setFallbackIn,
  setModelIn,
  setTimeoutIn,
  type TaskSetting,
} from '../lib/llm/llmSettingsMutations'
import { saveLlmSettings } from '../services/llmSettingsService'

const DEFAULT_TIMEOUT = 120

type SettingsSetter = Dispatch<SetStateAction<SettingsMap | null>>

// Editor de la configuración LLM: setters (que delegan en transformaciones puras)
// + guardado. Separado de useLlmSettings para acotar responsabilidades y tamaño.
export function useLlmSettingsEditor(
  settings: SettingsMap | null,
  setSettings: SettingsSetter,
  defaults: Record<string, Partial<TaskSetting>>,
) {
  const [saving, setSaving] = useState(false)

  const setModel = useCallback(
    (tipo: string, provider: string, modelId: string) => {
      setSettings((s) => setModelIn(s, tipo, provider, modelId))
    },
    [setSettings],
  )
  const setTipoTimeout = useCallback(
    (tipo: string, timeoutS: number) => {
      setSettings((s) => setTimeoutIn(s, tipo, timeoutS))
    },
    [setSettings],
  )
  const setFallback = useCallback(
    (tipo: string, index: number, provider: string, modelId: string) => {
      setSettings((s) => setFallbackIn(s, tipo, index, provider, modelId))
    },
    [setSettings],
  )
  const addFallback = useCallback(
    (tipo: string) => setSettings((s) => addFallbackIn(s, tipo)),
    [setSettings],
  )
  const removeFallback = useCallback(
    (tipo: string, index: number) =>
      setSettings((s) => removeFallbackIn(s, tipo, index)),
    [setSettings],
  )
  const moveFallback = useCallback(
    (tipo: string, index: number, dir: number) =>
      setSettings((s) => moveFallbackIn(s, tipo, index, dir)),
    [setSettings],
  )
  const resetTipo = useCallback(
    (tipo: string) =>
      setSettings((s) => resetTipoIn(s, tipo, defaults, DEFAULT_TIMEOUT)),
    [setSettings, defaults],
  )

  const save = useCallback(async (): Promise<boolean> => {
    if (!settings) return false
    setSaving(true)
    try {
      const data = (await saveLlmSettings(settings)) as {
        settings?: SettingsMap
      }
      if (data?.settings) setSettings(data.settings)
      toast.success('Configuración de IA guardada.')
      return true
    } catch (err) {
      toast.error(
        (err as Error)?.message || 'No se pudo guardar la configuración.',
      )
      return false
    } finally {
      setSaving(false)
    }
  }, [settings, setSettings])

  return {
    saving,
    setModel,
    setTipoTimeout,
    setFallback,
    addFallback,
    removeFallback,
    moveFallback,
    resetTipo,
    save,
  }
}

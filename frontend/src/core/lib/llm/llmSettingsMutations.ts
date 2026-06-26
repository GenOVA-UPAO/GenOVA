// Transformaciones puras del mapa de settings LLM por tarea (sin React). Extraídas
// de useLlmSettings para mantener el hook <200 líneas y poder testearlas aisladas.

export interface ModelEntry {
  provider: string
  model_id: string
  extra?: Record<string, unknown>
}

export interface TaskSetting {
  provider?: string
  model_id?: string
  timeout_s?: number
  fallbacks?: ModelEntry[]
}

export type SettingsMap = Record<string, TaskSetting>

export function setModelIn(
  s: SettingsMap | null,
  tipo: string,
  provider: string,
  modelId: string,
): SettingsMap {
  const base = s ?? {}
  return { ...base, [tipo]: { ...base[tipo], provider, model_id: modelId } }
}

export function setTimeoutIn(
  s: SettingsMap | null,
  tipo: string,
  timeoutS: number,
): SettingsMap {
  const base = s ?? {}
  return { ...base, [tipo]: { ...base[tipo], timeout_s: timeoutS } }
}

export function setFallbackIn(
  s: SettingsMap | null,
  tipo: string,
  index: number,
  provider: string,
  modelId: string,
): SettingsMap {
  const base = s ?? {}
  const fbs = [...(base[tipo]?.fallbacks || [])]
  if (index >= 0 && index < fbs.length)
    fbs[index] = { provider, model_id: modelId }
  return { ...base, [tipo]: { ...base[tipo], fallbacks: fbs } }
}

export function addFallbackIn(
  s: SettingsMap | null,
  tipo: string,
): SettingsMap {
  const base = s ?? {}
  const fbs = [...(base[tipo]?.fallbacks || []), { provider: '', model_id: '' }]
  return { ...base, [tipo]: { ...base[tipo], fallbacks: fbs } }
}

export function removeFallbackIn(
  s: SettingsMap | null,
  tipo: string,
  index: number,
): SettingsMap {
  const base = s ?? {}
  const fbs = (base[tipo]?.fallbacks || []).filter((_, i) => i !== index)
  return { ...base, [tipo]: { ...base[tipo], fallbacks: fbs } }
}

export function moveFallbackIn(
  s: SettingsMap | null,
  tipo: string,
  index: number,
  dir: number,
): SettingsMap {
  const base = s ?? {}
  const fbs = [...(base[tipo]?.fallbacks || [])]
  const ni = index + dir
  if (ni < 0 || ni >= fbs.length) return base
  ;[fbs[index], fbs[ni]] = [fbs[ni], fbs[index]]
  return { ...base, [tipo]: { ...base[tipo], fallbacks: fbs } }
}

export function resetTipoIn(
  s: SettingsMap | null,
  tipo: string,
  defaults: Record<string, Partial<TaskSetting>>,
  timeout: number,
): SettingsMap {
  const base = s ?? {}
  return { ...base, [tipo]: { ...defaults[tipo], timeout_s: timeout } }
}

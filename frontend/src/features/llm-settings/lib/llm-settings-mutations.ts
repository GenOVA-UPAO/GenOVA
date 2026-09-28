import { addEmpty, moveIn, removeAt, setAt } from "./fallback-array";

export interface ModelEntry {
  provider: string;
  model_id: string;
  extra?: Record<string, unknown>;
}

export interface TaskSetting {
  provider?: string;
  model_id?: string;
  timeout_s?: number;
  fallbacks?: ModelEntry[];
  /**
   * true = elección propia del usuario (se paga con su clave). false = sigue al
   * modelo de la plataforma: no se envía al guardar, así el admin puede cambiarlo.
   */
  override?: boolean;
}

export type SettingsMap = Record<string, TaskSetting>;

const emptyModelEntry = (): ModelEntry => ({ provider: "", model_id: "" });

function getFallbacks(s: SettingsMap | null, tipo: string): ModelEntry[] {
  return s?.[tipo]?.fallbacks ?? [];
}

function withFallbacks(s: SettingsMap | null, tipo: string, fbs: ModelEntry[]): SettingsMap {
  const base = s ?? {};
  return { ...base, [tipo]: { ...base[tipo], fallbacks: fbs, override: true } };
}

export function setModelIn(
  s: SettingsMap | null,
  tipo: string,
  provider: string,
  modelId: string,
): SettingsMap {
  const base = s ?? {};
  return { ...base, [tipo]: { ...base[tipo], provider, model_id: modelId, override: true } };
}

export function setTimeoutIn(s: SettingsMap | null, tipo: string, timeoutS: number): SettingsMap {
  const base = s ?? {};
  return { ...base, [tipo]: { ...base[tipo], timeout_s: timeoutS, override: true } };
}

/** Deja de usar una elección propia: la tarea vuelve a seguir a la plataforma. */
export function resetTipoIn(
  s: SettingsMap | null,
  tipo: string,
  platformDefaults: Record<string, Partial<TaskSetting>>,
  timeout: number,
): SettingsMap {
  const base = s ?? {};
  const platform = Object.hasOwn(platformDefaults, tipo) ? platformDefaults[tipo] : {};
  return {
    ...base,
    [tipo]: {
      provider: platform.provider,
      model_id: platform.model_id,
      timeout_s: timeout,
      fallbacks: [],
      override: false,
    },
  };
}

/** Payload del PUT: solo las elecciones propias, sin el campo `override`. */
export function overridesPayload(s: SettingsMap): SettingsMap {
  const out: SettingsMap = {};
  for (const [tipo, entry] of Object.entries(s)) {
    if (entry.override !== true) continue;
    out[tipo] = {
      provider: entry.provider,
      model_id: entry.model_id,
      timeout_s: entry.timeout_s,
      fallbacks: entry.fallbacks,
    };
  }
  return out;
}

export function setFallbackIn(
  s: SettingsMap | null,
  tipo: string,
  index: number,
  entry: ModelEntry,
): SettingsMap {
  const fbs = setAt(getFallbacks(s, tipo), index, {
    provider: entry.provider,
    model_id: entry.model_id,
  });
  return withFallbacks(s, tipo, fbs);
}

export function addFallbackIn(s: SettingsMap | null, tipo: string): SettingsMap {
  const fbs = addEmpty(getFallbacks(s, tipo), emptyModelEntry);
  return withFallbacks(s, tipo, fbs);
}

export function removeFallbackIn(s: SettingsMap | null, tipo: string, index: number): SettingsMap {
  const fbs = removeAt(getFallbacks(s, tipo), index);
  return withFallbacks(s, tipo, fbs);
}

export function moveFallbackIn(
  s: SettingsMap | null,
  tipo: string,
  index: number,
  dir: number,
): SettingsMap {
  const fbs = moveIn(getFallbacks(s, tipo), index, dir);
  if (fbs === getFallbacks(s, tipo)) return s ?? {};
  return withFallbacks(s, tipo, fbs);
}

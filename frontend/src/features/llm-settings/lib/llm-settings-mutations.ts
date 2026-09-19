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
}

export type SettingsMap = Record<string, TaskSetting>;

const emptyModelEntry = (): ModelEntry => ({ provider: "", model_id: "" });

function getFallbacks(s: SettingsMap | null, tipo: string): ModelEntry[] {
  return s?.[tipo]?.fallbacks ?? [];
}

function withFallbacks(s: SettingsMap | null, tipo: string, fbs: ModelEntry[]): SettingsMap {
  const base = s ?? {};
  return { ...base, [tipo]: { ...base[tipo], fallbacks: fbs } };
}

export function setModelIn(
  s: SettingsMap | null,
  tipo: string,
  provider: string,
  modelId: string,
): SettingsMap {
  const base = s ?? {};
  return { ...base, [tipo]: { ...base[tipo], provider, model_id: modelId } };
}

export function setTimeoutIn(s: SettingsMap | null, tipo: string, timeoutS: number): SettingsMap {
  const base = s ?? {};
  return { ...base, [tipo]: { ...base[tipo], timeout_s: timeoutS } };
}

export function resetTipoIn(
  s: SettingsMap | null,
  tipo: string,
  defaults: Record<string, Partial<TaskSetting>>,
  timeout: number,
): SettingsMap {
  const base = s ?? {};
  return { ...base, [tipo]: { ...defaults[tipo], timeout_s: timeout } };
}

export function setFallbackIn(
  s: SettingsMap | null,
  tipo: string,
  index: number,
  provider: string,
  modelId: string,
): SettingsMap {
  const fbs = setAt(getFallbacks(s, tipo), index, { provider, model_id: modelId });
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

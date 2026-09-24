import type { ProviderCheckResult } from "@/core/components/platform-provider-check";
import { apiJson } from "@/core/lib/http";

import type { EffectiveConfig } from "../lib/llm-config-draft";

/** Resultado de «Probar» un modelo (`POST …/test-model`). La clave nunca viene. */
export interface ModelTestResult {
  ok: boolean;
  /** `ok` | `no_key` | `invalid_key` | `no_credit` | `rate_limited` | `model_not_found` | `timeout` | `unreachable` | `empty` | `error`. */
  code: string;
  provider: string;
  model_id: string;
  latency_ms: number | null;
  excerpt: string | null;
  /** Con qué clave se probó: la de la plataforma, la del servidor o la propia. */
  key_source?: "platform" | "server" | "own";
  simulated: boolean;
}

export interface ConfigChange {
  task: string;
  field: "primary" | "fallbacks" | "generation";
  before: string;
  after: string;
  /** «Texto: DeepSeek V4.1 Flash → Claude Haiku 4.5». */
  text: string;
}

export interface Actor {
  id: string;
  name: string;
}

export interface HistoryEntry {
  id: string;
  at: string;
  actor: Actor | null;
  /** `manual` | `profile` | `restore` | `undo`. */
  source: string;
  /** Nombre del perfil aplicado o fecha de la versión restaurada. */
  detail: string | null;
  changes: ConfigChange[];
}

export interface ModelProfile {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  created_by?: Actor | null;
  config: EffectiveConfig;
  /** Lo que cambiaría si se aplicara ahora (vacío = es la config actual). */
  changes: ConfigChange[];
}

export interface ApplyConfigResponse {
  config: EffectiveConfig;
  tasks: string[];
  history_entry: HistoryEntry | null;
  /** Algún modelo ya no está en el catálogo y esa tarea quedó con el de siempre. */
  incomplete?: boolean;
}

const json = (body: unknown) => JSON.stringify(body);

export function testModel(
  provider: string,
  modelId: string,
  asAdmin: boolean,
): Promise<ModelTestResult> {
  const path = asAdmin
    ? "/api/admin/llm-config/test-model"
    : "/api/users/me/llm-settings/test-model";
  return apiJson(
    path,
    { method: "POST", body: json({ provider, model_id: modelId }) },
    { fallbackMsg: "No se pudo probar el modelo." },
  );
}

export function checkOwnProvider(provider: string): Promise<ProviderCheckResult> {
  return apiJson(
    `/api/users/me/api-keys/${encodeURIComponent(provider)}/check`,
    { method: "POST" },
    { fallbackMsg: "No se pudo comprobar la conexión." },
  );
}

export function getModelProfiles(): Promise<{ profiles: ModelProfile[]; limit: number }> {
  return apiJson(
    "/api/admin/llm-profiles",
    {},
    { fallbackMsg: "No se pudieron cargar los perfiles." },
  );
}

export function createModelProfile(name: string): Promise<{ profile: ModelProfile }> {
  return apiJson(
    "/api/admin/llm-profiles",
    { method: "POST", body: json({ name }) },
    { fallbackMsg: "No se pudo guardar el perfil." },
  );
}

export function renameModelProfile(id: string, name: string): Promise<{ profile: ModelProfile }> {
  return apiJson(
    `/api/admin/llm-profiles/${encodeURIComponent(id)}`,
    { method: "PATCH", body: json({ name }) },
    { fallbackMsg: "No se pudo renombrar el perfil." },
  );
}

export function deleteModelProfile(id: string): Promise<unknown> {
  return apiJson(
    `/api/admin/llm-profiles/${encodeURIComponent(id)}`,
    { method: "DELETE" },
    { fallbackMsg: "No se pudo borrar el perfil." },
  );
}

export function applyModelProfile(id: string): Promise<ApplyConfigResponse> {
  return apiJson(
    `/api/admin/llm-profiles/${encodeURIComponent(id)}/apply`,
    { method: "POST" },
    { fallbackMsg: "No se pudo aplicar el perfil." },
  );
}

export function getConfigHistory(): Promise<{ entries: HistoryEntry[]; limit: number }> {
  return apiJson(
    "/api/admin/llm-config/history",
    {},
    { fallbackMsg: "No se pudo cargar el historial." },
  );
}

/** `before` deshace ese cambio; `after` deja la config como quedó tras él. */
export function restoreConfigVersion(
  id: string,
  target: "before" | "after",
): Promise<ApplyConfigResponse> {
  return apiJson(
    `/api/admin/llm-config/history/${encodeURIComponent(id)}/restore`,
    { method: "POST", body: json({ target }) },
    { fallbackMsg: "No se pudo restaurar la configuración." },
  );
}

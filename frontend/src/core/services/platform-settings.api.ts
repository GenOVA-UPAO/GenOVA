import { apiJson } from "@/core/lib/http";

const PLATFORM_CONFIG = "/api/admin/platform-config";

export interface PlatformConfigResponse {
  /** Proveedor → key enmascarada (vacía o ausente si no está configurada). */
  platform_config?: Record<string, string>;
  providers?: string[];
}

export function getPlatformConfig(): Promise<PlatformConfigResponse> {
  return apiJson<PlatformConfigResponse>(
    PLATFORM_CONFIG,
    {},
    {
      fallbackMsg: "No se pudo cargar la configuración de plataforma.",
    },
  );
}

export function savePlatformConfigKey(
  provider: string,
  key: string,
): Promise<PlatformConfigResponse> {
  return apiJson<PlatformConfigResponse>(
    PLATFORM_CONFIG,
    { method: "PUT", body: JSON.stringify({ [provider]: key }) },
    { fallbackMsg: "No se pudo guardar la API key de plataforma." },
  );
}

export function getAdminLlmConfig(): Promise<unknown> {
  return apiJson(
    "/api/admin/llm-config",
    {},
    {
      fallbackMsg: "No se pudo cargar la configuración de modelos.",
    },
  );
}

export function saveAdminLlmConfig(config: unknown): Promise<unknown> {
  return apiJson(
    "/api/admin/llm-config",
    { method: "PUT", body: JSON.stringify(config) },
    { fallbackMsg: "No se pudo guardar la configuración de modelos." },
  );
}

export function getAdminNodesConfig(): Promise<unknown> {
  return apiJson(
    "/api/admin/nodes-config",
    {},
    {
      fallbackMsg: "No se pudo cargar la configuración de nodos.",
    },
  );
}

export function saveAdminNodesConfig(payload: unknown): Promise<unknown> {
  return apiJson(
    "/api/admin/nodes-config",
    { method: "PUT", body: JSON.stringify(payload) },
    { fallbackMsg: "No se pudo guardar la configuración de nodos." },
  );
}

export function getAdminGuardrails(): Promise<unknown> {
  return apiJson(
    "/api/admin/guardrails",
    {},
    {
      fallbackMsg: "No se pudo cargar la configuración de guardrails.",
    },
  );
}

export function saveAdminGuardrails(payload: unknown): Promise<unknown> {
  return apiJson(
    "/api/admin/guardrails",
    { method: "PUT", body: JSON.stringify(payload) },
    { fallbackMsg: "No se pudo guardar la configuración de guardrails." },
  );
}

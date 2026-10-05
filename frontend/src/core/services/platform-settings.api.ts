import i18n from "i18next";

import { apiJson } from "@/core/lib/http";

const PLATFORM_CONFIG = "/api/admin/platform-config";

export interface PlatformConfigResponse {
  /** Proveedor → key enmascarada (vacía o ausente si no está configurada). */
  platform_config?: Record<string, string>;
  providers?: string[];
  /** Proveedores con clave en una variable de entorno del servidor. Se usa si no hay clave guardada. */
  server_keys?: string[];
}

export function getPlatformConfig(): Promise<PlatformConfigResponse> {
  return apiJson<PlatformConfigResponse>(
    PLATFORM_CONFIG,
    {},
    {
      fallbackMsg: i18n.t("shared:no_se_pudo_cargar_la_configuracion_de_plataforma"),
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
    { fallbackMsg: i18n.t("shared:no_se_pudo_guardar_la_api_key_de_plataforma") },
  );
}

export function getAdminLlmConfig(): Promise<unknown> {
  return apiJson(
    "/api/admin/llm-config",
    {},
    {
      fallbackMsg: i18n.t("shared:no_se_pudo_cargar_la_configuracion_de_modelos"),
    },
  );
}

export function saveAdminLlmConfig(config: unknown): Promise<unknown> {
  return apiJson(
    "/api/admin/llm-config",
    { method: "PUT", body: JSON.stringify(config) },
    { fallbackMsg: i18n.t("shared:no_se_pudo_guardar_la_configuracion_de_modelos") },
  );
}

export function getAdminNodesConfig(): Promise<unknown> {
  return apiJson(
    "/api/admin/nodes-config",
    {},
    {
      fallbackMsg: i18n.t("shared:no_se_pudo_cargar_la_configuracion_de_nodos"),
    },
  );
}

export function saveAdminNodesConfig(payload: unknown): Promise<unknown> {
  return apiJson(
    "/api/admin/nodes-config",
    { method: "PUT", body: JSON.stringify(payload) },
    { fallbackMsg: i18n.t("shared:no_se_pudo_guardar_la_configuracion_de_nodos") },
  );
}

export function getAdminGuardrails(): Promise<unknown> {
  return apiJson(
    "/api/admin/guardrails",
    {},
    {
      fallbackMsg: i18n.t("shared:no_se_pudo_cargar_la_configuracion_de_guardrails"),
    },
  );
}

export function saveAdminGuardrails(payload: unknown): Promise<unknown> {
  return apiJson(
    "/api/admin/guardrails",
    { method: "PUT", body: JSON.stringify(payload) },
    { fallbackMsg: i18n.t("shared:no_se_pudo_guardar_la_configuracion_de_guardrails") },
  );
}

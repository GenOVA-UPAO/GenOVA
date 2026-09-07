import { Injectable } from "@angular/core";

import { apiJson } from "@/core/lib/http";

@Injectable({ providedIn: "root" })
export class PlatformSettingsService {
  getPlatformConfig(): Promise<unknown> {
    return apiJson(
      "/api/admin/platform-config",
      {},
      {
        fallbackMsg: "No se pudo cargar la configuración de plataforma.",
      },
    );
  }

  savePlatformConfigKey(provider: string, key: string): Promise<unknown> {
    return apiJson(
      "/api/admin/platform-config",
      { method: "PUT", body: JSON.stringify({ [provider]: key }) },
      { fallbackMsg: "No se pudo guardar la API key de plataforma." },
    );
  }

  getAdminLlmConfig(): Promise<unknown> {
    return apiJson(
      "/api/admin/llm-config",
      {},
      {
        fallbackMsg: "No se pudo cargar la configuración de modelos.",
      },
    );
  }

  saveAdminLlmConfig(config: unknown): Promise<unknown> {
    return apiJson(
      "/api/admin/llm-config",
      { method: "PUT", body: JSON.stringify(config) },
      { fallbackMsg: "No se pudo guardar la configuración de modelos." },
    );
  }

  getAdminNodesConfig(): Promise<unknown> {
    return apiJson(
      "/api/admin/nodes-config",
      {},
      {
        fallbackMsg: "No se pudo cargar la configuración de nodos.",
      },
    );
  }

  saveAdminNodesConfig(payload: unknown): Promise<unknown> {
    return apiJson(
      "/api/admin/nodes-config",
      { method: "PUT", body: JSON.stringify(payload) },
      { fallbackMsg: "No se pudo guardar la configuración de nodos." },
    );
  }

  getAdminGuardrails(): Promise<unknown> {
    return apiJson(
      "/api/admin/guardrails",
      {},
      {
        fallbackMsg: "No se pudo cargar la configuración de guardrails.",
      },
    );
  }

  saveAdminGuardrails(payload: unknown): Promise<unknown> {
    return apiJson(
      "/api/admin/guardrails",
      { method: "PUT", body: JSON.stringify(payload) },
      { fallbackMsg: "No se pudo guardar la configuración de guardrails." },
    );
  }
}

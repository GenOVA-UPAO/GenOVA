import { Injectable } from "@angular/core";
import { apiGetJson, apiPutJson } from "@/core/lib/http";

@Injectable({ providedIn: "root" })
export class PlatformSettingsService {
  getPlatformConfig(): Promise<unknown> {
    return apiGetJson(
      "/api/admin/platform-config",
      "No se pudo cargar la configuración de plataforma.",
    );
  }

  savePlatformConfigKey(provider: string, key: string): Promise<unknown> {
    return apiPutJson(
      "/api/admin/platform-config",
      { [provider]: key },
      "No se pudo guardar la API key de plataforma.",
    );
  }

  getAdminLlmConfig(): Promise<unknown> {
    return apiGetJson("/api/admin/llm-config", "No se pudo cargar la configuración de modelos.");
  }

  saveAdminLlmConfig(config: unknown): Promise<unknown> {
    return apiPutJson(
      "/api/admin/llm-config",
      config,
      "No se pudo guardar la configuración de modelos.",
    );
  }

  getAdminNodesConfig(): Promise<unknown> {
    return apiGetJson("/api/admin/nodes-config", "No se pudo cargar la configuración de nodos.");
  }

  saveAdminNodesConfig(payload: unknown): Promise<unknown> {
    return apiPutJson(
      "/api/admin/nodes-config",
      payload,
      "No se pudo guardar la configuración de nodos.",
    );
  }
}

import { Injectable } from "@angular/core";
import { apiFetch } from "../../../core/lib/http";

async function getJson(path: string, errMsg: string): Promise<unknown> {
  const res = await apiFetch(path);
  if (!res.ok) throw new Error(errMsg);
  return res.json();
}

async function putJson(path: string, body: unknown, errMsg: string): Promise<unknown> {
  const res = await apiFetch(path, {
    method: "PUT",
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let b: any = {};
    try {
      b = await res.json();
    } catch {}
    throw new Error(b.detail || errMsg);
  }
  return res.json();
}

@Injectable({ providedIn: "root" })
export class AdminSettingsService {
  getPlatformConfig(): Promise<unknown> {
    return getJson(
      "/api/admin/platform-config",
      "No se pudo cargar la configuración de plataforma.",
    );
  }

  savePlatformConfigKey(provider: string, key: string): Promise<unknown> {
    return putJson(
      "/api/admin/platform-config",
      { [provider]: key },
      "No se pudo guardar la API key de plataforma.",
    );
  }

  getAdminLlmConfig(): Promise<unknown> {
    return getJson("/api/admin/llm-config", "No se pudo cargar la configuración de modelos.");
  }

  saveAdminLlmConfig(config: unknown): Promise<unknown> {
    return putJson(
      "/api/admin/llm-config",
      config,
      "No se pudo guardar la configuración de modelos.",
    );
  }

  getAdminNodesConfig(): Promise<unknown> {
    return getJson("/api/admin/nodes-config", "No se pudo cargar la configuración de nodos.");
  }

  saveAdminNodesConfig(payload: unknown): Promise<unknown> {
    return putJson(
      "/api/admin/nodes-config",
      payload,
      "No se pudo guardar la configuración de nodos.",
    );
  }
}

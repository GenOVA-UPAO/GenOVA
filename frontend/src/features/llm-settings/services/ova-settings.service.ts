import { Injectable } from "@angular/core";

import { apiFetch } from "@/core/lib/http";

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
    let detail = errMsg;
    try {
      const b = (await res.json()) as { detail?: string };
      detail = b.detail || errMsg;
    } catch {
      /* ignore */
    }
    throw new Error(detail);
  }
  return res.json();
}

export interface OvaGenerationSettings {
  image_provider?: string;
  image_model?: string | null;
}

@Injectable({ providedIn: "root" })
export class OvaSettingsService {
  getOvaSettings(): Promise<{ settings: OvaGenerationSettings }> {
    return getJson(
      "/api/users/me/ova-settings",
      "No se pudo cargar la configuración de generación.",
    ) as Promise<{ settings: OvaGenerationSettings }>;
  }

  saveOvaSettings(data: Partial<OvaGenerationSettings>): Promise<unknown> {
    return putJson("/api/users/me/ova-settings", data, "No se pudo guardar la configuración.");
  }
}

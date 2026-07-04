import { Injectable } from "@angular/core";

import { apiFetch } from "@/core/lib/http";

const CACHE_KEY = "genova_rc";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

interface CacheEnvelope {
  data: unknown;
  ts: number;
}

function readCache(): unknown {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as CacheEnvelope;
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(data: unknown): void {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    /* localStorage unavailable */
  }
}

export interface ResourceConfigsResponse {
  configs?: Record<string, Record<string, number>>;
}

@Injectable({ providedIn: "root" })
export class ResourceConfigsService {
  async getResourceConfigs(): Promise<ResourceConfigsResponse> {
    const cached = readCache();
    if (cached) return cached;
    const res = await apiFetch("/api/users/me/resource-configs");
    if (!res.ok) throw new Error("No se pudo cargar la configuración de recursos.");
    const data = (await res.json()) as ResourceConfigsResponse;
    writeCache(data);
    return data;
  }

  async putResourceConfigs(
    configs: Record<string, Record<string, number>>,
  ): Promise<ResourceConfigsResponse> {
    writeCache({ configs });
    const res = await apiFetch("/api/users/me/resource-configs", {
      method: "PUT",
      body: JSON.stringify({ configs }),
    });
    if (!res.ok) {
      let detail = "No se pudo guardar la configuración de recursos.";
      try {
        const body = (await res.json()) as { detail?: string };
        detail = body.detail || detail;
      } catch {
        /* ignore */
      }
      throw new Error(detail);
    }
    return res.json() as Promise<ResourceConfigsResponse>;
  }

  /** Fire-and-forget persist used after phase-select confirm (React parity). */
  persistUserConfigs(configs: Record<string, Record<string, number>>): void {
    void this.putResourceConfigs(configs).catch(() => {});
  }
}

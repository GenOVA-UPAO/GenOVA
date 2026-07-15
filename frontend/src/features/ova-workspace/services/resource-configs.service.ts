import { inject, Injectable } from "@angular/core";

import { AuthService } from "@/core/auth/auth.service";
import { apiFetch } from "@/core/lib/http";

// Clave namespaced por usuario: con la clave fija anterior ("genova_rc"), en un
// navegador compartido el usuario B heredaba las configs cacheadas del usuario A.
const CACHE_PREFIX = "genova_rc";
const LEGACY_CACHE_KEY = "genova_rc";
const CACHE_TTL = 7 * 24 * 60 * 60 * 1000;

interface CacheEnvelope {
  data: unknown;
  ts: number;
}

function readCache(key: string): unknown {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    const { data, ts } = JSON.parse(raw) as CacheEnvelope;
    if (Date.now() - ts > CACHE_TTL) return null;
    return data;
  } catch {
    return null;
  }
}

function writeCache(key: string, data: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify({ data, ts: Date.now() }));
  } catch {
    /* localStorage unavailable */
  }
}

export interface ResourceConfigsResponse {
  configs?: Record<string, Record<string, number>>;
}

@Injectable({ providedIn: "root" })
export class ResourceConfigsService {
  private auth = inject(AuthService);

  constructor() {
    // Higiene: retira la cache legacy sin namespace (compartida entre usuarios).
    try {
      localStorage.removeItem(LEGACY_CACHE_KEY);
    } catch {
      /* ignore */
    }
  }

  private cacheKey(): string | null {
    const uid = this.auth.user()?.id;
    return uid != null ? `${CACHE_PREFIX}:${uid}` : null;
  }

  async getResourceConfigs(): Promise<ResourceConfigsResponse> {
    const key = this.cacheKey();
    const cached = key ? readCache(key) : null;
    if (cached) return cached;
    const res = await apiFetch("/api/users/me/resource-configs");
    if (!res.ok) throw new Error("No se pudo cargar la configuración de recursos.");
    const data = (await res.json()) as ResourceConfigsResponse;
    if (key) writeCache(key, data);
    return data;
  }

  async putResourceConfigs(
    configs: Record<string, Record<string, number>>,
  ): Promise<ResourceConfigsResponse> {
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
    // La cache se escribe solo tras el PUT exitoso: escribirla antes dejaba
    // configs fantasma sin rollback cuando el servidor rechazaba el guardado.
    const key = this.cacheKey();
    if (key) writeCache(key, { configs });
    return res.json() as Promise<ResourceConfigsResponse>;
  }

  /** Fire-and-forget persist used after phase-select confirm (React parity). */
  persistUserConfigs(configs: Record<string, Record<string, number>>): void {
    void this.putResourceConfigs(configs).catch(() => {});
  }
}

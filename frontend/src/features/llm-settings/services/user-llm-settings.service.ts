import { Injectable } from "@angular/core";
import { apiFetch } from "@/core/lib/http";
import type {
  EnabledModel,
  LlmSettingsResponse,
  SettingsMap,
} from "../lib/user-llm-settings.types";

export interface LlmSettingsParams {
  search?: string;
  category?: string;
  type?: string;
  page?: number;
  page_size?: number;
}

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

@Injectable({ providedIn: "root" })
export class UserLlmSettingsService {
  getLlmSettings(params: LlmSettingsParams = {}): Promise<LlmSettingsResponse> {
    const searchParams = new URLSearchParams();
    if (params.search) searchParams.set("search", params.search);
    if (params.category) searchParams.set("category", params.category);
    if (params.type) searchParams.set("type", params.type);
    if (params.page) searchParams.set("page", String(params.page));
    if (params.page_size) searchParams.set("page_size", String(params.page_size));
    const qs = searchParams.toString();
    return getJson(
      `/api/users/me/llm-settings${qs ? `?${qs}` : ""}`,
      "No se pudo cargar la configuración.",
    ) as Promise<LlmSettingsResponse>;
  }

  saveLlmSettings(settings: SettingsMap): Promise<LlmSettingsResponse> {
    return putJson(
      "/api/users/me/llm-settings",
      { settings },
      "No se pudo guardar la configuración.",
    ) as Promise<LlmSettingsResponse>;
  }

  refreshLlmCatalog(): Promise<unknown> {
    return apiFetch("/api/users/me/llm-settings/refresh-catalog", { method: "POST" }).then(
      (res) => {
        if (!res.ok) throw new Error("No se pudo actualizar el catálogo.");
        return res.json();
      },
    );
  }

  saveEnabledModels(models: EnabledModel[]): Promise<{ models?: EnabledModel[] }> {
    return putJson(
      "/api/users/me/enabled-models",
      { models },
      "No se pudo guardar el favorito.",
    ) as Promise<{ models?: EnabledModel[] }>;
  }

  getApiKeys(): Promise<{ api_keys: Record<string, string> }> {
    return getJson("/api/users/me/api-keys", "No se pudo cargar las API keys.") as Promise<{
      api_keys: Record<string, string>;
    }>;
  }

  saveApiKey(provider: string, key: string): Promise<{ api_keys: Record<string, string> }> {
    return putJson(
      "/api/users/me/api-keys",
      { [provider]: key },
      "No se pudo guardar la API key.",
    ) as Promise<{ api_keys: Record<string, string> }>;
  }

  getImageModels(provider: string): Promise<Array<{ id: string; label?: string }>> {
    return getJson(
      `/api/users/me/image-models?provider=${encodeURIComponent(provider)}`,
      "No se pudo cargar los modelos de imagen.",
    ).then((data) => {
      const models = (data as { models?: Array<{ id: string; label?: string }> }).models;
      return models ?? [];
    });
  }
}

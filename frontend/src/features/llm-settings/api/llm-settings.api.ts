import { t } from "i18next";

import { apiJson } from "@/core/lib/http";

import type { CatalogStatus } from "../lib/catalog-status";
import { overridesPayload, type SettingsMap } from "../lib/llm-settings-mutations";
import type { OwnCatalogStatus } from "../lib/own-catalog-status";
import type { EnabledModel, LlmSettingsResponse } from "../lib/user-llm-settings.types";

export interface LlmSettingsParams {
  search?: string;
  category?: string;
  type?: string;
  page?: number;
  page_size?: number;
}

export interface UserApiKeysResponse {
  api_keys: Record<string, string>;
}

export interface EnabledModelsResponse {
  models?: EnabledModel[];
}

export interface ImageModelOption {
  id: string;
  label?: string;
}

const json = (body: unknown) => JSON.stringify(body);

function withQuery(path: string, params: LlmSettingsParams): string {
  const searchParams = new URLSearchParams();
  if (params.search) searchParams.set("search", params.search);
  if (params.category) searchParams.set("category", params.category);
  if (params.type) searchParams.set("type", params.type);
  if (params.page) searchParams.set("page", String(params.page));
  if (params.page_size) searchParams.set("page_size", String(params.page_size));
  const qs = searchParams.toString();
  return qs ? `${path}?${qs}` : path;
}

export function getLlmSettings(params: LlmSettingsParams = {}): Promise<LlmSettingsResponse> {
  return apiJson(withQuery("/api/users/me/llm-settings", params), {}, {
    fallbackMsg: t("llm-settings:api.loadConfigError"),
  });
}

export function saveLlmSettings(settings: SettingsMap): Promise<LlmSettingsResponse> {
  return apiJson(
    "/api/users/me/llm-settings",
    { method: "PUT", body: json({ settings: overridesPayload(settings) }) },
    { fallbackMsg: t("llm-settings:api.saveConfigError") },
  );
}

export interface RefreshCatalogResponse {
  catalog_status?: CatalogStatus;
  own_catalog_status?: OwnCatalogStatus | null;
}

export function refreshLlmCatalog(): Promise<RefreshCatalogResponse> {
  return apiJson(
    "/api/users/me/llm-settings/refresh-catalog",
    { method: "POST" },
    { fallbackMsg: t("llm-settings:api.refreshCatalogError") },
  );
}

export function saveEnabledModels(models: EnabledModel[]): Promise<EnabledModelsResponse> {
  return apiJson(
    "/api/users/me/enabled-models",
    { method: "PUT", body: json({ models }) },
    { fallbackMsg: t("llm-settings:api.saveFavoriteError") },
  );
}

export function getUserApiKeys(): Promise<UserApiKeysResponse> {
  return apiJson("/api/users/me/api-keys", {}, { fallbackMsg: t("llm-settings:api.loadKeysError") });
}

export function saveUserApiKey(provider: string, key: string): Promise<UserApiKeysResponse> {
  return apiJson(
    "/api/users/me/api-keys",
    { method: "PUT", body: json({ [provider]: key }) },
    { fallbackMsg: t("llm-settings:api.saveKeyError") },
  );
}

export function getImageModels(provider: string): Promise<ImageModelOption[]> {
  const path = `/api/users/me/image-models?provider=${encodeURIComponent(provider)}`;
  return apiJson<{ models?: ImageModelOption[] }>(path, {}, {
    fallbackMsg: t("llm-settings:api.loadImagesError"),
  }).then((data) => data.models ?? []);
}

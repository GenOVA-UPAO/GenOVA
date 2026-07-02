import type { SettingsMap, TaskSetting } from "./llm-settings-mutations";

export interface EnabledModel {
  provider: string;
  model_id: string;
}

export interface CatalogModel {
  provider: string;
  model_id: string;
  label?: string;
  curated?: boolean;
  modality?: string;
  category?: string;
  context_length?: number;
  pricing?: string;
  pricing_detail?: {
    input?: number;
    output?: number;
    cache_read?: number;
    cache_write?: number;
  };
  description?: string;
}

export interface LlmSettingsResponse {
  settings?: SettingsMap;
  has_own_llm_key?: boolean;
  catalog?: Record<string, CatalogModel[]>;
  catalog_all?: CatalogModel[];
  enabled_models?: EnabledModel[];
  defaults?: Record<string, EnabledModel>;
  timeout_bounds?: number[];
  catalog_full?: CatalogModel[];
  full_total?: number;
  full_page?: number;
  full_has_more?: boolean;
  categories?: string[];
  types?: string[];
  catalog_status?: Record<string, { ok: boolean; last_success_at?: string }>;
}

export interface LoadOpts {
  append?: boolean;
  page?: number;
  search?: string;
  category?: string;
  type?: string;
}

export type { SettingsMap, TaskSetting };

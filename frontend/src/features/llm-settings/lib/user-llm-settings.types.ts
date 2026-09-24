import type { CatalogStatus } from "./catalog-status";
import type { EffectiveConfig } from "./llm-config-draft";
import type { SettingsMap } from "./llm-settings-mutations";

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
  /** Config efectiva de la plataforma (semilla ⊕ admin): lo que se usa sin clave propia. */
  platform?: EffectiveConfig;
  timeout_bounds?: number[];
  catalog_full?: CatalogModel[];
  full_total?: number;
  full_page?: number;
  full_has_more?: boolean;
  categories?: string[];
  types?: string[];
  catalog_status?: CatalogStatus;
}

export interface LoadOpts {
  append?: boolean;
  page?: number;
  search?: string;
  category?: string;
  type?: string;
}

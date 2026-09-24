import type { GroupBy, SortKey } from "../lib/catalog-sort";
import type { CatalogStatus } from "../lib/catalog-status";
import type { EffectiveConfig } from "../lib/llm-config-draft";
import type { SettingsMap } from "../lib/llm-settings-mutations";
import type { OwnCatalogStatus } from "../lib/own-catalog-status";
import type { CatalogModel, EnabledModel } from "../lib/user-llm-settings.types";

export interface LlmSettingsStore {
  settings: SettingsMap | null;
  catalog: Record<string, CatalogModel[]>;
  catalogFull: CatalogModel[];
  /** Catálogo curado completo, sin los filtros de «Abrir catálogo»: para nombres. */
  catalogAll: CatalogModel[];
  catalogEnabled: CatalogModel[];
  fullTotal: number;
  fullHasMore: boolean;
  categories: string[];
  types: string[];
  enabledModels: EnabledModel[];
  defaults: Record<string, EnabledModel>;
  platform: EffectiveConfig | null;
  bounds: number[];
  hasOwnLlmKey: boolean;
  loading: boolean;
  loadingMore: boolean;
  saving: boolean;
  dirty: boolean;
  error: string;
  /** Reintenta la carga de la configuración (no el refresco del catálogo). */
  refetch: () => void;
  catalogStatus: CatalogStatus | null;
  /** Estado de las listas pedidas con las claves propias (`null` para el admin). */
  ownCatalogStatus: OwnCatalogStatus | null;
  refreshingCatalog: boolean;
  searchQuery: string;
  categoryFilter: string;
  typeFilter: string;
  sortKey: SortKey;
  groupBy: GroupBy;
  handleSearch: (query: string) => void;
  handleCategory: (category: string) => void;
  handleType: (type: string) => void;
  handleSort: (key: SortKey) => void;
  handleGroup: (group: GroupBy) => void;
  loadMore: () => void;
  isDefaultModel: (provider: string, modelId: string) => boolean;
  isModelEnabled: (provider: string, modelId: string) => boolean;
  toggleFavorite: (provider: string, modelId: string) => Promise<void>;
  setModel: (tipo: string, provider: string, modelId: string) => void;
  setTipoTimeout: (tipo: string, timeoutS: number) => void;
  resetTipo: (tipo: string) => void;
  setFallback: (tipo: string, index: number, provider: string, modelId: string) => void;
  addFallback: (tipo: string) => void;
  removeFallback: (tipo: string, index: number) => void;
  save: () => Promise<boolean>;
  discard: () => void;
  retryRefresh: () => Promise<void>;
}

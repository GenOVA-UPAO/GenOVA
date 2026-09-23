import type { EnabledModel, LlmSettingsResponse } from "../lib/user-llm-settings.types";
import type { LlmSettingsStore } from "./llm-settings-store.types";
import { useLlmCatalog } from "./use-llm-catalog";
import { useLlmFavorites } from "./use-llm-favorites";
import { useLlmSettingsDraft } from "./use-llm-settings-draft";

export function useLlmSettingsStore(enabled = true): LlmSettingsStore {
  const catalog = useLlmCatalog(enabled);
  const draft = useLlmSettingsDraft(catalog.server, catalog.queryClient);
  const favorites = useLlmFavorites(serverEnabled(catalog.server));
  const catalogMap = catalog.server.catalog ?? {};

  return {
    settings: draft.settings,
    catalog: catalogMap,
    catalogFull: catalog.catalogFull,
    catalogEnabled: Object.values(catalogMap).flat(),
    fullTotal: catalog.server.full_total ?? catalog.catalogFull.length,
    fullHasMore: catalog.fullHasMore,
    categories: catalog.server.categories ?? [],
    types: catalog.server.types ?? [],
    enabledModels: favorites.enabledModels,
    defaults: catalog.server.defaults ?? {},
    platform: catalog.server.platform ?? null,
    bounds: draft.bounds,
    hasOwnLlmKey: catalog.server.has_own_llm_key ?? false,
    loading: catalog.loading,
    loadingMore: catalog.loadingMore,
    saving: draft.saving,
    dirty: draft.dirty,
    error: catalog.error,
    refetch: catalog.refetch,
    catalogStatus: catalog.server.catalog_status ?? null,
    refreshingCatalog: catalog.refreshingCatalog,
    searchQuery: catalog.searchQuery,
    categoryFilter: catalog.categoryFilter,
    typeFilter: catalog.typeFilter,
    sortKey: catalog.sortKey,
    groupBy: catalog.groupBy,
    handleSearch: catalog.handleSearch,
    handleCategory: catalog.handleCategory,
    handleType: catalog.handleType,
    handleSort: catalog.handleSort,
    handleGroup: catalog.handleGroup,
    loadMore: catalog.loadMore,
    isDefaultModel: (provider, modelId) => isDefault(catalog.server.defaults ?? {}, provider, modelId),
    isModelEnabled: favorites.isModelEnabled,
    toggleFavorite: favorites.toggleFavorite,
    setModel: draft.setModel,
    setTipoTimeout: draft.setTipoTimeout,
    resetTipo: draft.resetTipo,
    setFallback: draft.setFallback,
    addFallback: draft.addFallback,
    removeFallback: draft.removeFallback,
    save: draft.save,
    discard: draft.discard,
    retryRefresh: catalog.retryRefresh,
  };
}

function serverEnabled(server: LlmSettingsResponse): EnabledModel[] {
  return Array.isArray(server.enabled_models) ? server.enabled_models : [];
}

function isDefault(
  defaults: Record<string, EnabledModel>,
  provider: string,
  modelId: string,
): boolean {
  return Object.values(defaults).some((item) => item.provider === provider && item.model_id === modelId);
}

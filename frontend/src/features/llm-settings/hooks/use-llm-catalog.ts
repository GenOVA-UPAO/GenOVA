import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { refreshLlmCatalog } from "../api/llm-settings.api";
import { failedProviders, providerLabel } from "../lib/catalog-status";
import { dedupeCatalogModels, dedupeCatalogPage } from "../lib/dedupe-catalog";
import { joinList } from "../lib/join-list";
import type { LlmSettingsResponse } from "../lib/user-llm-settings.types";
import { errorMessage } from "./error-message";
import { llmSettingsKeys } from "./query-keys";
import { useLlmCatalogFilters } from "./use-llm-catalog-filters";
import { useLlmCatalogQuery } from "./use-llm-catalog-query";

const EMPTY_RESPONSE: LlmSettingsResponse = {};

export function firstSettingsPage(pages: LlmSettingsResponse[] | undefined): LlmSettingsResponse {
  return dedupeCatalogPage(pages?.[0] ?? EMPTY_RESPONSE);
}

export function flattenCatalog(pages: LlmSettingsResponse[] | undefined) {
  return dedupeCatalogModels((pages ?? []).flatMap((page) => page.catalog_full ?? []));
}

export function useLlmCatalog(enabled: boolean) {
  const queryClient = useQueryClient();
  const filters = useLlmCatalogFilters();
  const [refreshingCatalog, setRefreshingCatalog] = useState(false);
  const query = useLlmCatalogQuery(
    enabled,
    filters.searchQuery,
    filters.categoryFilter,
    filters.typeFilter,
  );

  useFetchRemainingPages(filters.sortKey, query.hasNextPage, query.isFetchingNextPage, query.fetchNextPage);

  return {
    queryClient,
    server: firstSettingsPage(query.data?.pages),
    catalogFull: flattenCatalog(query.data?.pages),
    loading: query.isLoading,
    loadingMore: query.isFetchingNextPage,
    error: query.error ? errorMessage(query.error, "No se pudo cargar la configuración.") : "",
    refetch: () => {
      void query.refetch();
    },
    searchQuery: filters.searchInput,
    categoryFilter: filters.categoryFilter,
    typeFilter: filters.typeFilter,
    sortKey: filters.sortKey,
    groupBy: filters.groupBy,
    fullHasMore: query.hasNextPage,
    handleSearch: filters.handleSearch,
    handleCategory: filters.handleCategory,
    handleType: filters.handleType,
    handleSort: filters.handleSort,
    handleGroup: filters.handleGroup,
    loadMore: () => {
      if (query.isFetchingNextPage || !query.hasNextPage) return;
      void query.fetchNextPage();
    },
    retryRefresh: () => retryCatalogRefresh(queryClient, setRefreshingCatalog),
    refreshingCatalog,
  };
}

function useFetchRemainingPages(
  sortKey: string,
  hasNextPage: boolean,
  isFetchingNextPage: boolean,
  fetchNextPage: () => Promise<unknown>,
): void {
  useEffect(() => {
    if (sortKey === "default" || !hasNextPage || isFetchingNextPage) return;
    void fetchNextPage();
  }, [sortKey, hasNextPage, isFetchingNextPage, fetchNextPage]);
}

async function retryCatalogRefresh(
  queryClient: ReturnType<typeof useQueryClient>,
  setRefreshing: (value: boolean) => void,
): Promise<void> {
  setRefreshing(true);
  try {
    const result = await refreshLlmCatalog();
    await queryClient.invalidateQueries({ queryKey: llmSettingsKeys.all });
    // Sin esto, si el proveedor seguía caído el aviso no cambiaba y parecía que
    // «Reintentar» no había hecho nada.
    const still = failedProviders(result.catalog_status);
    if (still.length === 0) toast.success("Catálogo actualizado.");
    else {
      const verb = still.length === 1 ? "sigue" : "siguen";
      toast.error(`${joinList(still.map(providerLabel))} ${verb} sin responder.`);
    }
  } catch (err) {
    toast.error(errorMessage(err, "No se pudo actualizar el catálogo."));
  } finally {
    setRefreshing(false);
  }
}

import { useInfiniteQuery } from "@tanstack/react-query";

import { getLlmSettings } from "../api/llm-settings.api";
import type { LlmSettingsResponse } from "../lib/user-llm-settings.types";
import { llmSettingsKeys } from "./query-keys";

const CATALOG_PAGE_SIZE = 1000;

export function useLlmCatalogQuery(
  enabled: boolean,
  search: string,
  category: string,
  type: string,
) {
  return useInfiniteQuery({
    queryKey: llmSettingsKeys.list({ search, category, type }),
    queryFn: ({ pageParam }) =>
      getLlmSettings({
        search,
        category,
        type,
        page: pageParam,
        page_size: CATALOG_PAGE_SIZE,
      }),
    initialPageParam: 1,
    getNextPageParam: (last: LlmSettingsResponse) =>
      last.full_has_more ? (last.full_page ?? 1) + 1 : undefined,
    enabled,
  });
}

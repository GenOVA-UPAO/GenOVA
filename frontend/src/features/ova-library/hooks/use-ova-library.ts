import {
  keepPreviousData,
  useMutation,
  useQuery,
  useQueryClient,
} from "@tanstack/react-query";

import { ovaLibraryApi,type OvaListParams } from "../api/ova-library.api";

/** Query keys: every OVA list/count lives under ["ova"], so one invalidation refreshes all. */
export const ovaKeys = {
  all: ["ova"] as const,
  list: (p: OvaListParams) => ["ova", "list", p] as const,
  trash: (page: number) => ["ova", "trash", page] as const,
  trashCount: ["ova", "trash-count"] as const,
};

export function useOvaList(params: OvaListParams) {
  return useQuery({
    queryKey: ovaKeys.list(params),
    queryFn: () => ovaLibraryApi.list(params),
    // Keep the current page on screen while the next one loads (no skeleton flash).
    placeholderData: keepPreviousData,
  });
}

export function useTrashList(page: number) {
  return useQuery({
    queryKey: ovaKeys.trash(page),
    queryFn: () => ovaLibraryApi.trash(page),
    placeholderData: keepPreviousData,
  });
}

/** Sidebar badge. Shares the ["ova"] prefix, so every OVA mutation refreshes it. */
export function useTrashCount(enabled = true) {
  return useQuery({
    queryKey: ovaKeys.trashCount,
    queryFn: ovaLibraryApi.trashCount,
    select: (d) => d.count || 0,
    enabled,
  });
}

/** Wraps an OVA mutation so success invalidates lists, trash and the badge together. */
export function useOvaMutation<TVars, TData = unknown>(fn: (vars: TVars) => Promise<TData>) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (vars: TVars) => fn(vars),
    onSettled: () => qc.invalidateQueries({ queryKey: ovaKeys.all }),
  });
}

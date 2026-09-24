import { useMutation, useQuery } from "@tanstack/react-query";

import { getConfigHistory, restoreConfigVersion } from "../api/model-tools.api";
import { modelToolsKeys } from "./model-tools-keys";

/** Historial de cambios de la config de plataforma (solo admin, al abrirlo). */
export function useConfigHistory(enabled: boolean) {
  const query = useQuery({ queryKey: modelToolsKeys.history, queryFn: getConfigHistory, enabled });
  const restore = useMutation({
    mutationFn: (id: string) => restoreConfigVersion(id, "after"),
  });
  return {
    entries: query.data?.entries ?? [],
    limit: query.data?.limit ?? 30,
    loading: query.isLoading,
    error: query.error,
    refetch: () => {
      void query.refetch();
    },
    restore,
  };
}

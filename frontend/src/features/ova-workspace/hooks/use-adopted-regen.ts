import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { cancelOvaRegeneration, fetchActiveRegeneration, fetchRegenerationProgress } from "../api/ova-workspace.api";
import { ovaWorkspaceKey } from "./use-ova-workspace";

/**
 * Regeneración que ya estaba en marcha al abrir el editor (otra pestaña, una
 * recarga). El editor se muestra igual, con un aviso «Aplicando cambios…»,
 * su progreso y la opción de cancelar; al terminar recarga el OVA.
 */
export function useAdoptedRegen(ovaId: string, enabled: boolean) {
  const queryClient = useQueryClient();
  const refresh = () => Promise.all([queryClient.invalidateQueries({ queryKey: ovaWorkspaceKey(ovaId) }), queryClient.invalidateQueries({ queryKey: ["ova"] })]);
  const active = useQuery({ queryKey: ["ova-active-regen", ovaId], queryFn: () => fetchActiveRegeneration(ovaId), enabled });
  const jobId = active.data?.job_id ?? undefined;
  const progress = useQuery({
    queryKey: ["ova-regen-progress", ovaId, jobId],
    enabled: enabled && Boolean(jobId),
    queryFn: async () => {
      const dto = await fetchRegenerationProgress(ovaId, jobId ?? "");
      if (dto.status === "success" || dto.status === "error" || dto.status === "cancelled") await refresh();
      return dto;
    },
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      return status === "success" || status === "error" || status === "cancelled" ? false : 3_000;
    },
  });
  const cancel = useMutation({ mutationFn: () => cancelOvaRegeneration(ovaId, jobId ?? "") });
  return {
    jobId,
    percentage: progress.data?.percentage ?? 0,
    cancelling: cancel.isPending || cancel.isSuccess,
    cancel: () => { cancel.mutate(); },
  };
}

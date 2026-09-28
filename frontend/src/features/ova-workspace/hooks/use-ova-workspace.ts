import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { addOvaPhase, deleteOvaPhase, downloadOvaScorm, fetchOvaVersions, fetchOvaWorkspace, fetchPhaseVersions, fetchVersionDiff, reorderOvaPhases, revertOvaVersion, revertPhaseVersion, saveOvaPhase, triggerOvaRegeneration } from "../api/ova-workspace.api";

export const ovaWorkspaceKey = (ovaId: string) => ["ova-workspace", ovaId] as const;

export function useOvaWorkspace(ovaId: string | undefined) {
  const queryClient = useQueryClient();
  const invalidate = () => Promise.all([queryClient.invalidateQueries({ queryKey: ovaWorkspaceKey(ovaId ?? "") }), queryClient.invalidateQueries({ queryKey: ["ova"] })]);
  const query = useQuery({ queryKey: ovaId ? ovaWorkspaceKey(ovaId) : ["ova-workspace", "none"], queryFn: () => fetchOvaWorkspace(ovaId ?? ""), enabled: Boolean(ovaId) });
  const savePhase = useMutation({ mutationFn: ({ phaseId, content }: { phaseId: string; content: string }) => saveOvaPhase(ovaId ?? "", phaseId, content), onSuccess: invalidate });
  const addPhase = useMutation({ mutationFn: ({ phaseType, prompt }: { phaseType: string; prompt: string }) => addOvaPhase(ovaId ?? "", phaseType, prompt), onSuccess: invalidate });
  const deletePhase = useMutation({ mutationFn: (phaseId: string) => deleteOvaPhase(ovaId ?? "", phaseId), onSuccess: invalidate });
  const reorder = useMutation({ mutationFn: (reorders: unknown) => reorderOvaPhases(ovaId ?? "", reorders), onSuccess: invalidate });
  const regenerate = useMutation({ mutationFn: triggerOvaRegeneration.bind(null, ovaId ?? ""), onSuccess: invalidate });
  return { ...query, addPhase, deletePhase, downloadScorm: () => downloadOvaScorm(ovaId ?? ""), fetchPhaseVersions: (phaseId: string) => fetchPhaseVersions(ovaId ?? "", phaseId), fetchVersionDiff: (first: string | number, second: string | number) => fetchVersionDiff(ovaId ?? "", first, second), fetchVersions: () => fetchOvaVersions(ovaId ?? ""), regenerate, reorder, revertPhaseVersion: (phaseId: string, versionId: string) => revertPhaseVersion(ovaId ?? "", phaseId, versionId), revertVersion: (versionId: string) => revertOvaVersion(ovaId ?? "", versionId), savePhase };
}

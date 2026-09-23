import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { ConfirmModal } from "@/core/components/confirm-modal";

import { fetchVersionDiff, revertOvaVersion } from "../../api/ova-workspace.api";
import { ovaWorkspaceKey, useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { orderedVersionIds, type OvaVersionRow, sortVersionsDesc } from "../../lib/ova-versioning";
import { WorkspaceModal } from "../shared/workspace-modal";
import { VersionDiff } from "./version-diff";
import { VersionHistoryFooter } from "./version-history-footer";
import { VersionHistoryList } from "./version-history-list";

export default function VersionHistoryPanel({ ovaId, onClose }: Readonly<{ ovaId: string; onClose: () => void }>) {
  const workspace = useOvaWorkspace(ovaId);
  const client = useQueryClient();
  const versions = sortVersionsDesc(workspace.data?.version_history as OvaVersionRow[] | undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState<string>();
  const diff = useMutation({
    mutationFn: () => {
      const [older, newer] = orderedVersionIds(selected, versions);
      return fetchVersionDiff(ovaId, older, newer);
    },
  });
  const revert = useMutation({
    mutationFn: (id: string) => revertOvaVersion(ovaId, id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ovaWorkspaceKey(ovaId) });
      await client.invalidateQueries({ queryKey: ["ova"] });
      onClose();
    },
  });
  const toggle = (id: string, checked: boolean) => {
    setSelected(checked ? [...selected, id].slice(0, 2) : selected.filter((value) => value !== id));
    diff.reset();
  };
  const targetNumber = String(versions.find((version) => version.id === target)?.version_number ?? "");
  const error = diff.error ?? revert.error;
  return (
    <WorkspaceModal
      title="Historial de versiones"
      description="Compara dos versiones del OVA o restaura una anterior."
      size="lg"
      onClose={onClose}
      footer={
        <VersionHistoryFooter
          canCompare={versions.length > 1}
          selectedCount={selected.length}
          comparing={diff.isPending}
          onCompare={() => {
            diff.mutate();
          }}
          onClose={onClose}
        />
      }
    >
      <VersionHistoryList versions={versions} selected={selected} onToggle={toggle} onRestore={setTarget} />
      {diff.data && <VersionDiff data={diff.data} />}
      {error && <p role="alert" className="text-sm text-destructive">{error.message}</p>}
      {target && (
        <ConfirmModal
          title={`¿Restaurar la versión ${targetNumber}?`}
          message={`El OVA volverá a tener el contenido de la versión ${targetNumber}.`}
          confirmLabel="Restaurar versión"
          danger={false}
          isLoading={revert.isPending}
          onConfirm={() => {
            revert.mutate(target);
          }}
          onCancel={() => {
            setTarget(undefined);
          }}
        />
      )}
    </WorkspaceModal>
  );
}

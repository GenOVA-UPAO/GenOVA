import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/core/components/ui/button";

import { fetchVersionDiff, revertOvaVersion } from "../../api/ova-workspace.api";
import { ovaWorkspaceKey, useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { orderedVersionIds, type OvaVersionRow, sortVersionsDesc } from "../../lib/ova-versioning";
import { WorkspaceModal } from "../shared/workspace-modal";
import { RevertConfirm } from "./revert-confirm";
import { VersionDiff } from "./version-diff";
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
  return (
    <WorkspaceModal title="Historial de versiones" onClose={onClose}>
      <VersionHistoryList
        versions={versions}
        selected={selected}
        onToggle={toggle}
        onRestore={setTarget}
      />
      <Button
        disabled={selected.length !== 2 || diff.isPending}
        onClick={() => {
          diff.mutate();
        }}
      >
        Comparar versiones
      </Button>
      {diff.data && <VersionDiff data={diff.data} />}
      {target && (
        <RevertConfirm
          pending={revert.isPending}
          onConfirm={() => {
            revert.mutate(target);
          }}
          onCancel={() => {
            setTarget(undefined);
          }}
        />
      )}
      {diff.error && <p role="alert">{diff.error.message}</p>}
      {revert.error && <p role="alert">{revert.error.message}</p>}
    </WorkspaceModal>
  );
}

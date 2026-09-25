import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";

import { fetchVersionDiff, revertOvaVersion } from "../../api/ova-workspace.api";
import { ovaWorkspaceKey, useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { orderedVersionIds, type OvaVersionRow, sortVersionsDesc } from "../../lib/ova-versioning";
import { WorkspaceModal } from "../shared/workspace-modal";
import { RestoreVersionConfirm } from "./restore-version-confirm";
import { VersionDiff } from "./version-diff";
import { VersionHistoryFooter } from "./version-history-footer";
import { VersionHistoryList } from "./version-history-list";

export default function VersionHistoryPanel({
  ovaId,
  readOnly = false,
  onClose,
}: Readonly<{ ovaId: string; readOnly?: boolean; onClose: () => void }>) {
  const workspace = useOvaWorkspace(ovaId);
  const client = useQueryClient();
  const versions = sortVersionsDesc(workspace.data?.version_history as OvaVersionRow[] | undefined);
  const [selected, setSelected] = useState<string[]>([]);
  const [target, setTarget] = useState<string>();
  const { diff, diffRef } = useVersionCompare(ovaId, selected, versions);
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
  const targetNumber = String(
    versions.find((version) => version.id === target)?.version_number ?? "",
  );
  const error = diff.error ?? revert.error;
  return (
    <WorkspaceModal
      title="Historial de versiones"
      description={historyDescription(readOnly)}
      size={diff.data ? "xl" : "lg"}
      onClose={onClose}
      footer={
        <VersionHistoryFooter
          canCompare={versions.length > 1}
          selectedCount={selected.length}
          comparing={diff.isPending}
          compared={Boolean(diff.data)}
          onCompare={() => {
            diff.mutate();
          }}
          onClose={onClose}
        />
      }
    >
      <VersionHistoryList
        versions={versions}
        selected={selected}
        onToggle={toggle}
        onRestore={restoreHandler(readOnly, setTarget)}
      />
      {diff.data && (
        <div ref={diffRef} className="scroll-mt-2">
          <VersionDiff data={diff.data} />
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error.message}
        </p>
      )}
      {target && (
        <RestoreVersionConfirm
          versionNumber={targetNumber}
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

/** Comparación de las dos versiones marcadas; al llegar, se desplaza a la vista. */
function useVersionCompare(ovaId: string, selected: string[], versions: OvaVersionRow[]) {
  const diffRef = useRef<HTMLDivElement>(null);
  const diff = useMutation({
    mutationFn: () => {
      const [older, newer] = orderedVersionIds(selected, versions);
      return fetchVersionDiff(ovaId, older, newer);
    },
    onSuccess: () => {
      // La comparación aparece bajo la lista: se lleva a la vista para que se note que llegó.
      requestAnimationFrame(() => {
        diffRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      });
    },
  });
  return { diff, diffRef };
}

function historyDescription(readOnly: boolean): string {
  if (readOnly) return "Compara dos versiones del OVA.";
  return "Compara dos versiones del OVA o restaura una anterior.";
}

/** Sin «Restaurar» cuando el OVA es de otra persona. */
function restoreHandler(
  readOnly: boolean,
  restore: (id: string) => void,
): ((id: string) => void) | undefined {
  return readOnly ? undefined : restore;
}

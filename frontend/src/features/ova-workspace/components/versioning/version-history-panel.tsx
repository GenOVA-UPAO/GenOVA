import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchVersionDiff, revertOvaVersion } from "../../api/ova-workspace.api";
import { ovaWorkspaceKey, useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { orderedVersionIds, type OvaVersionRow, sortVersionsDesc } from "../../lib/ova-versioning";
import { WorkspaceModal } from "../shared/workspace-modal";
import { RestoreVersionConfirm } from "./restore-version-confirm";
import { VersionDiff } from "./version-diff";
import { VersionHistoryFooter } from "./version-history-footer";
import { VersionHistoryList } from "./version-history-list";

function toggleSelection(current: string[], id: string): string[] {
  return current.includes(id)
    ? current.filter((value) => value !== id)
    : [...current, id].slice(0, 2);
}

interface RestoreConfirmOptions {
  target: string | undefined;
  versions: OvaVersionRow[];
  isLoading: boolean;
  onConfirm: (targetId: string) => void;
  onCancel: () => void;
}

function renderRestoreConfirm({
  target,
  versions,
  isLoading,
  onConfirm,
  onCancel,
}: Readonly<RestoreConfirmOptions>) {
  if (!target) return null;
  const match = versions.find((version) => version.id === target);
  const versionNumber = String(match?.version_number ?? "");
  return (
    <RestoreVersionConfirm
      versionNumber={versionNumber}
      isLoading={isLoading}
      onConfirm={() => {
        onConfirm(target);
      }}
      onCancel={onCancel}
    />
  );
}

export default function VersionHistoryPanel({
  ovaId,
  readOnly = false,
  onClose,
}: Readonly<{ ovaId: string; readOnly?: boolean; onClose: () => void }>) {
  const { t } = useTranslation("workspace-versioning");
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
  const toggle = (id: string) => {
    setSelected(toggleSelection(selected, id));
    diff.reset();
  };
  const error = diff.error ?? revert.error;
  const descriptionKey = readOnly ? "history.descriptionReadOnly" : "history.description";
  return (
    <WorkspaceModal
      title={t("history.title")}
      description={t(descriptionKey)}
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
      {renderRestoreConfirm({
        target,
        versions,
        isLoading: revert.isPending,
        onConfirm: (targetId) => {
          revert.mutate(targetId);
        },
        onCancel: () => {
          setTarget(undefined);
        },
      })}
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

/** Sin «Restaurar» cuando el OVA es de otra persona. */
function restoreHandler(
  readOnly: boolean,
  restore: (id: string) => void,
): ((id: string) => void) | undefined {
  return readOnly ? undefined : restore;
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";
import { Button } from "@/core/components/ui/button";

import { fetchPhaseVersions, revertPhaseVersion } from "../../api/ova-workspace.api";
import { ovaWorkspaceKey } from "../../hooks/use-ova-workspace";
import type { PhaseMicroVersion } from "../../lib/version-history.types";
import { WorkspaceModal } from "../shared/workspace-modal";

export default function PhaseVersionHistory({
  ovaId,
  phaseId,
  onClose,
}: Readonly<{ ovaId: string; phaseId: string; onClose: () => void }>) {
  const client = useQueryClient();
  const [selected, setSelected] = useState<PhaseMicroVersion>();
  const versions = useQuery({ queryKey: ["ova-phase-versions", ovaId, phaseId], queryFn: () => fetchPhaseVersions(ovaId, phaseId) });
  const revert = useMutation({
    mutationFn: (id: string) => revertPhaseVersion(ovaId, phaseId, id),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: ovaWorkspaceKey(ovaId) });
      await client.invalidateQueries({ queryKey: ["ova"] });
      onClose();
    },
  });
  return (
    <WorkspaceModal title="Versiones del recurso" onClose={onClose}>
      {versions.isPending && <p role="status">Cargando versiones…</p>}
      <ul className="space-y-2">
        {versions.data?.micro_versions?.map((version) => (
          <li key={version.id}>
            <Button
              variant="outline"
              onClick={() => {
                setSelected(version);
              }}
            >
              Versión {version.minor_number}
            </Button>
          </li>
        ))}
      </ul>
      {selected && (
        <section className="space-y-3">
          <HtmlPreviewFrame html={selected.content} />
          <Button
            disabled={revert.isPending}
            onClick={() => {
              revert.mutate(selected.id);
            }}
          >
            Restaurar esta versión
          </Button>
        </section>
      )}
      {versions.error && <p role="alert">{versions.error.message}</p>}
      {revert.error && <p role="alert">{revert.error.message}</p>}
    </WorkspaceModal>
  );
}

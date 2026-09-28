import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { Button } from "@/core/components/ui/button";

import { fetchPhaseVersions, revertPhaseVersion } from "../../api/ova-workspace.api";
import { ovaWorkspaceKey } from "../../hooks/use-ova-workspace";
import type { PhaseMicroVersion } from "../../lib/version-history.types";
import { ModalActions } from "../shared/modal-actions";
import { WorkspaceModal } from "../shared/workspace-modal";
import { PhaseVersionBody } from "./phase-version-body";

interface Props {
  ovaId: string;
  phaseId: string;
  resourceName?: string;
  onClose: () => void;
}

export default function PhaseVersionHistory({ ovaId, phaseId, resourceName, onClose }: Readonly<Props>) {
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
  const items = versions.data?.micro_versions ?? [];
  const status = selected ? `Versión ${String(selected.minor_number)} seleccionada` : "Elige una versión para restaurarla.";
  const description = resourceName ? `Versiones anteriores de «${resourceName}».` : undefined;
  return (
    <WorkspaceModal
      title="Versiones del recurso"
      description={description}
      size="xl"
      onClose={onClose}
      footer={
        <ModalActions status={items.length > 0 && status}>
          <Button variant="outline" onClick={onClose}>{items.length > 0 ? "Cancelar" : "Cerrar"}</Button>
          {items.length > 0 && (
            <Button
              disabled={!selected}
              loading={revert.isPending}
              onClick={() => {
                if (selected) revert.mutate(selected.id);
              }}
            >
              Restaurar esta versión
            </Button>
          )}
        </ModalActions>
      }
    >
      <PhaseVersionBody
        pending={versions.isPending}
        error={versions.error}
        items={items}
        selected={selected}
        onSelect={setSelected}
      />
      {revert.error && <p role="alert" className="text-sm text-destructive">{revert.error.message}</p>}
    </WorkspaceModal>
  );
}

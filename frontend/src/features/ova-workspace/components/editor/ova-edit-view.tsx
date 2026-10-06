import { useState } from "react";
import { useTranslation } from "react-i18next";

import { HttpError } from "@/core/lib/http";

import { useChatRegeneration } from "../../hooks/use-chat-regeneration";
import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import type { PhaseWithContent } from "../../lib/types";
import { OvaEditLayout } from "./ova-edit-layout";
import { OvaGeneratingPanel } from "./ova-generating-panel";
import { WorkspaceApplyingGate } from "./workspace-applying-gate";
import { WorkspaceLoadError } from "./workspace-load-error";
import { WorkspaceSkeleton } from "./workspace-skeleton";

function errorStatus(error: Error | null): number {
  return error instanceof HttpError ? error.status : 0;
}

/**
 * Al volver a pedir el OVA tras un 409, la consulta vuelve a «pending»: si se
 * pintara el esqueleto, el panel se desmontaría y, al montarse otra vez con el
 * job ya terminado, pediría el OVA de nuevo en bucle mientras siga el 409.
 */
function showsGeneration(error: Error | null, awaitingReady: boolean, pending: boolean): boolean {
  return errorStatus(error) === 409 || (awaitingReady && pending);
}

/** Un backend antiguo no manda `status`: se deja intentar y decide el servidor. */
function isExportable(status: string | undefined): boolean {
  return status === undefined || status === "listo";
}

export function OvaEditView({ ovaId }: Readonly<{ ovaId: string }>) {
  const { t } = useTranslation();
  const workspace = useOvaWorkspace(ovaId);
  const regen = useChatRegeneration(ovaId);
  const [awaitingReady, setAwaitingReady] = useState(false);
  const phases = (workspace.data?.current_version?.phases ?? []) as PhaseWithContent[];
  const title = workspace.data?.title ?? t("workspace:mi_ova");
  if (showsGeneration(workspace.error, awaitingReady, workspace.isPending))
    return (
      <OvaGeneratingPanel
        ovaId={ovaId}
        onReady={() => {
          setAwaitingReady(true);
          void workspace.refetch();
        }}
      />
    );
  if (workspace.isPending) return <WorkspaceSkeleton />;
  if (workspace.error)
    return (
      <WorkspaceLoadError
        status={errorStatus(workspace.error)}
        message={workspace.error.message}
        onRetry={() => {
          void workspace.refetch();
        }}
      />
    );
  // Regeneración ya en curso al abrir el editor: se ve igual, con un aviso (no la
  // pantalla de generación inicial). La de esta sesión la avisa el pie del panel.
  return (
    <WorkspaceApplyingGate ovaId={ovaId} status={workspace.data.status} busy={regen.busy}>
    <OvaEditLayout
      ovaId={ovaId}
      title={title}
      version={workspace.data.current_version?.version_number}
      // Un backend antiguo no manda `can_edit`: se asume que se puede editar.
      readOnly={workspace.data.can_edit === false}
      canExport={isExportable(workspace.data.status)}
      phases={phases}
      regen={regen}
    />
    </WorkspaceApplyingGate>
  );
}

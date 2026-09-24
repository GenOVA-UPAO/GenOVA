import { lazy, Suspense, useState } from "react";

import type { ChatRegeneration } from "../../hooks/use-chat-regeneration";
import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { buttonRegenPayload } from "../../lib/regen-chat";
import type { PhaseWithContent } from "../../lib/types";
import { type OvaPanelTab, WorkspaceOvaPanelTabs } from "./workspace-ova-panel-tabs";
import { WorkspaceRegenStatus } from "./workspace-regen-status";
import { WorkspaceResourceList } from "./workspace-resource-list";

const WorkspaceHtmlPreview = lazy(() => import("./workspace-html-preview"));
const sectionTypes = (phases: PhaseWithContent[]): string[] => {
  const seen = new Map<string, true>();
  for (const phase of phases) seen.set(phase.phase_type, true);
  return Array.from(seen.keys());
};

interface Props {
  ovaId: string;
  phases: PhaseWithContent[];
  regen: ChatRegeneration;
}

export function WorkspaceOvaPanel({ ovaId, phases, regen }: Readonly<Props>) {
  const [tab, setTab] = useState<OvaPanelTab>("preview");
  // La edición se monta al abrirla y ya no se desmonta: cambiar a «Vista previa»
  // para comprobar algo no debe descartar el HTML que aún no se ha guardado.
  const [editOpened, setEditOpened] = useState(false);
  const workspace = useOvaWorkspace(ovaId);
  const changeTab = (next: OvaPanelTab) => {
    if (next === "edit") setEditOpened(true);
    setTab(next);
  };
  const handleGroupReorder = (phaseType: string, group: PhaseWithContent[]) => {
    let index = 0;
    const reordered = phases.map((phase) =>
      phase.phase_type === phaseType ? group[index++] : phase,
    );
    workspace.reorder.mutate(
      reordered.map((phase, order) => ({ phase_id: phase.id, new_order: order })),
    );
  };
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <WorkspaceOvaPanelTabs tab={tab} onChange={changeTab} />
      <div className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <div
          id="workspace-ova-preview"
          role="tabpanel"
          aria-label="Vista previa"
          hidden={tab !== "preview"}
          className="h-full"
        >
          <Suspense
            fallback={
              <p role="status" className="p-4 text-sm text-muted-foreground">
                Cargando vista previa…
              </p>
            }
          >
            <WorkspaceHtmlPreview phases={phases} />
          </Suspense>
        </div>
        <div
          id="workspace-ova-edit"
          role="tabpanel"
          aria-label="Editar"
          hidden={tab !== "edit"}
          className="h-full min-h-0 space-y-6 overflow-y-auto p-3 sm:p-4"
        >
          {editOpened &&
            sectionTypes(phases).map((phaseType) => (
              <WorkspaceResourceList
                key={phaseType}
                ovaId={ovaId}
                phaseType={phaseType}
                phases={phases.filter((phase) => phase.phase_type === phaseType)}
                busy={regen.busy}
                onReorder={(group) => {
                  handleGroupReorder(phaseType, group);
                }}
                onRegenerate={(phase) => {
                  if (!regen.busy)
                    regen.request.mutate(
                      buttonRegenPayload(phases, "Regenerar recurso", [phase.id]),
                    );
                }}
              />
            ))}
        </div>
      </div>
      <WorkspaceRegenStatus regen={regen} reorderError={workspace.reorder.error?.message} />
    </section>
  );
}

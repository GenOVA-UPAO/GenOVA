import { lazy, Suspense, useState } from "react";

import type { ChatRegeneration } from "../../hooks/use-chat-regeneration";
import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import type { PhaseWithContent } from "../../lib/types";
import { WorkspaceEditSections } from "./workspace-edit-sections";
import { type OvaPanelTab, WorkspaceOvaPanelTabs } from "./workspace-ova-panel-tabs";
import { WorkspaceRegenStatus } from "./workspace-regen-status";

const WorkspaceHtmlPreview = lazy(() => import("./workspace-html-preview"));

interface Props {
  ovaId: string;
  phases: PhaseWithContent[];
  regen: ChatRegeneration;
  /** Solo la vista previa: el OVA es de otra persona. */
  readOnly?: boolean;
}

export function WorkspaceOvaPanel({ ovaId, phases, regen, readOnly = false }: Readonly<Props>) {
  const [tab, setTab] = useState<OvaPanelTab>("preview");
  // La edición se monta al abrirla y ya no se desmonta: cambiar a «Vista previa»
  // para comprobar algo no debe descartar el HTML que aún no se ha guardado.
  const [editOpened, setEditOpened] = useState(false);
  const workspace = useOvaWorkspace(ovaId);
  const changeTab = (next: OvaPanelTab) => {
    if (next === "edit") setEditOpened(true);
    setTab(next);
  };
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <WorkspaceOvaPanelTabs tab={tab} onChange={changeTab} readOnly={readOnly} />
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
            <WorkspaceHtmlPreview phases={phases} ovaId={ovaId} readOnly={readOnly} />
          </Suspense>
        </div>
        <div
          id="workspace-ova-edit"
          role="tabpanel"
          aria-label="Editar"
          hidden={tab !== "edit"}
          className="h-full min-h-0 space-y-6 overflow-y-auto p-3 sm:p-4"
        >
          {editOpened && <WorkspaceEditSections ovaId={ovaId} phases={phases} regen={regen} />}
        </div>
      </div>
      {!readOnly && (
        <WorkspaceRegenStatus regen={regen} reorderError={workspace.reorder.error?.message} />
      )}
    </section>
  );
}

import { lazy, Suspense, useState } from "react";

import { Button } from "@/core/components/ui/button";

import { useChatRegeneration } from "../../hooks/use-chat-regeneration";
import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import type { PhaseWithContent } from "../../lib/types";
import { WorkspacePanelToolbar } from "./workspace-panel-toolbar";
import { WorkspaceResourceList } from "./workspace-resource-list";

const WorkspaceHtmlPreview = lazy(() => import("./workspace-html-preview"));
const sectionTypes = (phases: PhaseWithContent[]): string[] => {
  const seen = new Map<string, true>();
  for (const phase of phases) seen.set(phase.phase_type, true);
  return Array.from(seen.keys());
};

export function WorkspaceOvaPanel({ ovaId, phases }: Readonly<{ ovaId: string; phases: PhaseWithContent[] }>) {
  const [tab, setTab] = useState("preview");
  const workspace = useOvaWorkspace(ovaId);
  const regen = useChatRegeneration(ovaId);
  const handleGroupReorder = (phaseType: string, group: PhaseWithContent[]) => {
    let index = 0;
    const reordered = phases.map((phase) => (phase.phase_type === phaseType ? group[index++] : phase));
    workspace.reorder.mutate(reordered.map((phase, order) => ({ phase_id: phase.id, new_order: order })));
  };
  return (
    <section className="min-w-0 space-y-4 p-4">
      <WorkspacePanelToolbar ovaId={ovaId} />
      <div className="flex gap-2" role="tablist" aria-label="Contenido del OVA">
        <Button
          role="tab"
          aria-selected={tab === "preview"}
          variant={tab === "preview" ? "default" : "outline"}
          onClick={() => {
            setTab("preview");
          }}
        >
          Vista previa
        </Button>
        <Button
          role="tab"
          aria-selected={tab === "edit"}
          variant={tab === "edit" ? "default" : "outline"}
          onClick={() => {
            setTab("edit");
          }}
        >
          Editar
        </Button>
      </div>
      <Suspense fallback={<p role="status">Cargando visor…</p>}>
        {tab === "preview" ? (
          <WorkspaceHtmlPreview phases={phases} />
        ) : (
          sectionTypes(phases).map((phaseType) => (
            <WorkspaceResourceList
              key={phaseType}
              ovaId={ovaId}
              phaseType={phaseType}
              phases={phases.filter((phase) => phase.phase_type === phaseType)}
              onReorder={(group) => {
                handleGroupReorder(phaseType, group);
              }}
              onRegenerate={(phase) => {
                regen.request.mutate({ prompt: "Regenerar recurso", phaseIds: [phase.id] });
              }}
            />
          ))
        )}
      </Suspense>
      {workspace.reorder.error && <p role="alert">{workspace.reorder.error.message}</p>}
      {regen.busy && <p role="status">Regenerando… {regen.progress.percentage}%</p>}
      {regen.request.error && <p role="alert">{regen.request.error.message}</p>}
    </section>
  );
}

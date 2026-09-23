import { lazy, Suspense, useState } from "react";

import { Icon } from "@/core/components/icon";

import { useChatRegeneration } from "../../hooks/use-chat-regeneration";
import { useOvaWorkspace } from "../../hooks/use-ova-workspace";
import { buttonRegenPayload } from "../../lib/regen-chat";
import type { PhaseWithContent } from "../../lib/types";
import { SegmentedTabs } from "../shared/segmented-tabs";
import { WorkspaceResourceList } from "./workspace-resource-list";

const WorkspaceHtmlPreview = lazy(() => import("./workspace-html-preview"));
const sectionTypes = (phases: PhaseWithContent[]): string[] => {
  const seen = new Map<string, true>();
  for (const phase of phases) seen.set(phase.phase_type, true);
  return Array.from(seen.keys());
};

export function WorkspaceOvaPanel({ ovaId, phases }: Readonly<{ ovaId: string; phases: PhaseWithContent[] }>) {
  const [tab, setTab] = useState<"preview" | "edit">("preview");
  const workspace = useOvaWorkspace(ovaId);
  const regen = useChatRegeneration(ovaId);
  const handleGroupReorder = (phaseType: string, group: PhaseWithContent[]) => {
    let index = 0;
    const reordered = phases.map((phase) => (phase.phase_type === phaseType ? group[index++] : phase));
    workspace.reorder.mutate(reordered.map((phase, order) => ({ phase_id: phase.id, new_order: order })));
  };
  return (
    <section className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
      <div className="flex h-12 shrink-0 items-center gap-3 border-b border-border px-3 sm:px-4">
        <SegmentedTabs
          label="Contenido del OVA"
          value={tab}
          onChange={setTab}
          options={[
            { value: "preview", label: "Vista previa", icon: "eye", controls: "workspace-ova-content" },
            { value: "edit", label: "Editar", icon: "pencil-simple", controls: "workspace-ova-content" },
          ]}
        />
        <p className="hidden truncate text-xs text-muted-foreground lg:block">
          {tab === "preview" ? "Así lo verán tus estudiantes." : "Edita, reordena o regenera cada recurso."}
        </p>
      </div>
      <div id="workspace-ova-content" className="min-h-0 min-w-0 flex-1 overflow-hidden">
        <Suspense fallback={<p role="status" className="p-4 text-sm text-muted-foreground">Cargando visor…</p>}>
          {tab === "preview" ? (
            <WorkspaceHtmlPreview phases={phases} />
          ) : (
            <div className="h-full min-h-0 space-y-6 overflow-y-auto p-3 sm:p-4">
              {sectionTypes(phases).map((phaseType) => (
                <WorkspaceResourceList
                  key={phaseType}
                  ovaId={ovaId}
                  phaseType={phaseType}
                  phases={phases.filter((phase) => phase.phase_type === phaseType)}
                  onReorder={(group) => {
                    handleGroupReorder(phaseType, group);
                  }}
                  onRegenerate={(phase) => {
                    regen.request.mutate(buttonRegenPayload(phases, "Regenerar recurso", [phase.id]));
                  }}
                />
              ))}
            </div>
          )}
        </Suspense>
      </div>
      {workspace.reorder.error && <p role="alert" className="shrink-0 border-t border-border px-4 py-2 text-sm text-destructive">{workspace.reorder.error.message}</p>}
      {regen.busy && (
        <p role="status" className="flex shrink-0 items-center gap-2 border-t border-border px-4 py-2 text-sm text-muted-foreground">
          <Icon name="spinner" className="size-4 animate-spin text-primary" />
          Regenerando recurso… {regen.progress.percentage}%
        </p>
      )}
      {regen.request.error && <p role="alert" className="shrink-0 border-t border-border px-4 py-2 text-sm text-destructive">{regen.request.error.message}</p>}
    </section>
  );
}

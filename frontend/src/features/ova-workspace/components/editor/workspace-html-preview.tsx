import { useState } from "react";

import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";

import { humanizeResourceType } from "../../lib/ova-job-view-model";
import { phaseMeta } from "../../lib/phase-meta";
import type { PhaseWithContent } from "../../lib/types";
import { WorkspacePreviewFooter } from "./workspace-preview-footer";
import { WorkspacePreviewTabs } from "./workspace-preview-tabs";

/**
 * Pestañas distinguibles: sin título propio, dos recursos de la misma fase
 * colapsaban en la misma pestaña (WS-02/CR-01). Prioriza el título; si falta,
 * compone fase + tipo humanizado y sufija "(2)", "(3)" si aun así se repite.
 */
function baseLabel(phase: PhaseWithContent): string {
  const title = phase.title?.trim();
  if (title) return title;
  const meta = phaseMeta(phase.phase_type);
  const type = humanizeResourceType(phase.resource_type as string | number | undefined);
  return type ? `${meta.label}: ${type}` : meta.label || phase.phase_type;
}

function uniqueLabels(phases: PhaseWithContent[]): Map<string, string> {
  const seen = new Map<string, number>();
  const result = new Map<string, string>();
  for (const phase of phases) {
    const base = baseLabel(phase);
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    result.set(phase.id, count > 1 ? `${base} (${String(count)})` : base);
  }
  return result;
}

export default function WorkspaceHtmlPreview({ phases }: Readonly<{ phases: PhaseWithContent[] }>) {
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = (activeId ? phases.find((phase) => phase.id === activeId) : undefined) ?? phases.at(0);
  return (
    <section role="presentation" className="flex h-full min-h-0 flex-col bg-muted/30 p-0 sm:p-3">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card sm:rounded-xl sm:border sm:border-border">
        <WorkspacePreviewTabs phases={phases} labels={uniqueLabels(phases)} activeId={active?.id ?? null} onSelect={setActiveId} />
        <div className="min-h-0 flex-1 overflow-hidden bg-background">
          <HtmlPreviewFrame
            html={active?.content ?? ""}
            className="block h-full min-h-0 w-full border-0"
            height={null}
            title={active?.title ?? "Vista previa del recurso"}
          />
        </div>
        <WorkspacePreviewFooter
          active={active}
          position={active ? phases.indexOf(active) + 1 : 0}
          total={phases.length}
        />
      </div>
    </section>
  );
}

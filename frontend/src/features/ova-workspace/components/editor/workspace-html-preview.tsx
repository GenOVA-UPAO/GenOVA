import { useState } from "react";

import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";
import { Icon } from "@/core/components/icon";

import { humanizeResourceType } from "../../lib/ova-job-view-model";
import { phaseMeta } from "../../lib/phase-meta";
import { resourceDisplayName } from "../../lib/resource-display-name";
import type { PhaseWithContent } from "../../lib/types";
import { WorkspacePreviewEmpty } from "./workspace-preview-empty";
import { WorkspacePreviewFooter } from "./workspace-preview-footer";
import { WorkspacePreviewTabs } from "./workspace-preview-tabs";

/**
 * Pestañas distinguibles: sin título propio, dos recursos de la misma fase
 * colapsaban en la misma pestaña (WS-02/CR-01). Prioriza el título; si falta,
 * compone fase + tipo humanizado y sufija "(2)", "(3)" si aun así se repite.
 */
function baseLabel(phase: PhaseWithContent): string {
  const title = phase.title?.trim();
  if (title) return resourceDisplayName(title);
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

function pickActive(
  phases: PhaseWithContent[],
  selection: Selection | null,
): PhaseWithContent | undefined {
  if (!selection) return phases.at(0);
  // Regenerar crea ids nuevos: si el elegido ya no existe, se queda en la misma posición.
  return (
    phases.find((phase) => phase.id === selection.id) ??
    phases.at(Math.min(selection.index, phases.length - 1))
  );
}

interface Selection {
  id: string;
  index: number;
}

export default function WorkspaceHtmlPreview({ phases }: Readonly<{ phases: PhaseWithContent[] }>) {
  const [selection, setSelection] = useState<Selection | null>(null);
  const active = pickActive(phases, selection);
  const position = active ? phases.indexOf(active) : -1;
  const select = (index: number) => {
    const phase = phases.at(index);
    if (phase) setSelection({ id: phase.id, index });
  };
  if (phases.length === 0) return <WorkspacePreviewEmpty />;
  return (
    <section role="presentation" className="flex h-full min-h-0 flex-col bg-muted/30 p-0 sm:p-3">
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-card sm:rounded-xl sm:border sm:border-border">
        <WorkspacePreviewTabs
          phases={phases}
          labels={uniqueLabels(phases)}
          activeId={active?.id ?? null}
          onSelect={(id) => {
            select(phases.findIndex((phase) => phase.id === id));
          }}
        />
        <div className="relative min-h-0 flex-1 overflow-hidden bg-background">
          <HtmlPreviewFrame
            html={active?.content ?? ""}
            className="peer block h-full min-h-0 w-full border-0"
            height={null}
            title={active?.title ?? "Vista previa del recurso"}
          />
          {/* El iframe marca aria-busy mientras pinta el recurso: sin este aviso parecía vacío. */}
          <p
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 hidden items-center justify-center gap-2 text-sm text-muted-foreground peer-aria-busy:flex"
          >
            <Icon name="spinner" className="size-4 animate-spin" />
            Cargando vista previa…
          </p>
        </div>
        <WorkspacePreviewFooter
          active={active}
          position={position + 1}
          total={phases.length}
          onPrevious={() => {
            select(position - 1);
          }}
          onNext={() => {
            select(position + 1);
          }}
        />
      </div>
    </section>
  );
}

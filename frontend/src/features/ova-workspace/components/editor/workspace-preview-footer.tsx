import { Icon } from "@/core/components/icon";

import { phaseMeta } from "../../lib/phase-meta";
import type { PhaseWithContent } from "../../lib/types";

/** Contexto del recurso visible: su fase 5E y si se regeneró. El nombre ya está en la pestaña. */
export function WorkspacePreviewFooter({ active, position, total }: Readonly<{ active: PhaseWithContent | undefined; position: number; total: number }>) {
  if (!active) return null;
  const meta = phaseMeta(active.phase_type);
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2 border-t border-border px-3 py-2 text-xs text-muted-foreground">
      <span className={`shrink-0 rounded-full border px-2 py-0.5 font-medium ${meta.badge}`}>
        Fase: {meta.label || active.phase_type}
      </span>
      <span className="shrink-0 tabular-nums">
        Recurso {position} de {total}
      </span>
      {active.regenerated && (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 font-medium text-foreground">
          <Icon name="sparkle" className="size-3.5 text-accent-brand" />
          Regenerado
        </span>
      )}
    </div>
  );
}

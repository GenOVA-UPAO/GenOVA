import { Icon } from "@/core/components/icon";

import type { PhaseWithContent } from "../../lib/types";

interface Props {
  phases: PhaseWithContent[];
  activePhaseId: string;
  onSelectPhase: (phaseId: string) => void;
}

export function VisualEditorHeader({
  phases,
  activePhaseId,
  onSelectPhase,
}: Readonly<Props>) {
  return (
    <div className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-2xs sm:flex-row sm:items-center sm:justify-between">
      <div className="space-y-1">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-full bg-primary/10 text-primary">
            <Icon name="sparkle" className="size-3.5" />
          </span>
          <h2 className="font-heading text-base font-bold text-foreground">
            Editor visual de recursos (beta)
          </h2>
          <span className="rounded-full bg-accent-brand/15 px-2 py-0.5 text-[10px] font-bold text-accent-brand uppercase">
            FastAPI · Laya
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Recompone la estructura del recurso con decisiones deterministas sobre componentes UPAO.
        </p>
      </div>

      {phases.length > 1 && (
        <div className="flex items-center gap-2">
          <label htmlFor="resource-select" className="text-xs font-medium text-muted-foreground">
            Recurso:
          </label>
          <select
            id="resource-select"
            value={activePhaseId}
            onChange={(e) => {
              onSelectPhase(e.target.value);
            }}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold text-foreground focus-visible:ring-2 focus-visible:ring-ring"
          >
            {phases.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title ?? p.phase_type}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}

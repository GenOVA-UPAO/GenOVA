import { useState } from "react";

import { Button } from "@/core/components/ui/button";

import { phaseMeta } from "../../lib/phase-meta";
import { resourceDisplayName } from "../../lib/resource-display-name";
import type { VersionDiffPhase } from "../../lib/version-history.types";
import { VersionDiffCell } from "./version-diff-cell";

interface Props {
  before: { number: string; phase: VersionDiffPhase | undefined };
  after: { number: string; phase: VersionDiffPhase | undefined };
}

function rowTitle(phase: VersionDiffPhase | undefined): string {
  if (!phase) return "Recurso";
  const name = phase.title ? resourceDisplayName(phase.title) : "";
  const phaseName = phaseMeta(phase.phase_type).label || phase.phase_type;
  return name ? `${phaseName} · ${name}` : phaseName;
}

/**
 * Un recurso en las dos versiones. Si no cambió, se pliega: lo que interesa al
 * comparar es lo que cambió, y cada vista previa es un iframe.
 */
export function VersionDiffRow({ before, after }: Readonly<Props>) {
  const changed = before.phase?.content !== after.phase?.content;
  const [open, setOpen] = useState(changed);
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <h4 className="text-sm font-medium">{rowTitle(after.phase ?? before.phase)}</h4>
        <span
          className={
            changed
              ? "rounded-full bg-accent-brand/12 px-2 py-0.5 text-xs font-medium text-foreground"
              : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
          }
        >
          {changed ? "Cambió" : "Sin cambios"}
        </span>
        {!changed && (
          <Button
            variant="ghost"
            size="sm"
            aria-expanded={open}
            onClick={() => {
              setOpen(!open);
            }}
          >
            {open ? "Ocultar" : "Ver igualmente"}
          </Button>
        )}
      </div>
      {open && (
        <div className="grid gap-3 md:grid-cols-2 md:gap-4">
          <VersionDiffCell side="Anterior" number={before.number} phase={before.phase} />
          <VersionDiffCell side="Posterior" number={after.number} phase={after.phase} />
        </div>
      )}
    </div>
  );
}

import { Badge } from "@/core/components/ui/badge";

import { phaseMeta } from "../../lib/phase-meta";
import type { PhaseWithContent } from "../../lib/types";

export function WorkspacePreviewFooter({ active }: Readonly<{ active: PhaseWithContent | undefined }>) {
  if (!active) return null;
  const meta = phaseMeta(active.phase_type);
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2 border-t border-border bg-muted/20 px-3 py-1">
      <Badge variant="outline" className={`shrink-0 text-[10px] ${meta.badge}`}>
        {meta.label || active.phase_type}
      </Badge>
      {active.title && <span className="truncate text-xs text-muted-foreground">{active.title}</span>}
      {active.regenerated && <span className="ml-auto shrink-0 text-[10px] text-muted-foreground">✦ regenerado</span>}
    </div>
  );
}

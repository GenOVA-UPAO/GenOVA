import { Icon } from "@/core/components/icon";
import { Badge } from "@/core/components/ui/badge";

import { phaseMeta } from "../../lib/phase-meta";
import type { PhaseWithContent } from "../../lib/types";

export function WorkspacePreviewFooter({ active }: Readonly<{ active: PhaseWithContent | undefined }>) {
  if (!active) return null;
  const meta = phaseMeta(active.phase_type);
  return (
    <div className="flex min-w-0 shrink-0 items-center gap-2.5 border-t border-border bg-muted/30 px-3 py-2.5">
      <Badge variant="outline" className={`shrink-0 text-xs ${meta.badge}`}>
        {meta.label || active.phase_type}
      </Badge>
      {active.title && <span className="truncate text-sm text-muted-foreground">{active.title}</span>}
      {active.regenerated && (
        <span className="ml-auto inline-flex shrink-0 items-center gap-1 text-xs font-medium text-muted-foreground">
          <Icon name="sparkle" className="size-3.5 text-accent-brand" />
          regenerado
        </span>
      )}
    </div>
  );
}

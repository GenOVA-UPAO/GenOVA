import { Badge } from "@/core/components/ui/badge";

import type { OvaJobInfo } from "../../lib/job-types";

interface OvaCardBadgesProps {
  versionNumber?: unknown;
  isGenerating?: boolean;
  job?: OvaJobInfo;
}

/** Badges de versión y progreso de generación para OvaCard. */
export function OvaCardBadges({
  versionNumber,
  isGenerating,
  job,
}: Readonly<OvaCardBadgesProps>) {
  return (
    <div className="flex items-center gap-1">
      {Boolean(versionNumber) && (
        <Badge variant="outline" className="text-[10px] text-muted-foreground">
          v{String(versionNumber)}
        </Badge>
      )}
      {isGenerating && job?.progress && (
        <Badge variant="outline" className="border-primary/30 text-[10px] text-primary">
          {job.progress.done}/{job.progress.total}
        </Badge>
      )}
    </div>
  );
}

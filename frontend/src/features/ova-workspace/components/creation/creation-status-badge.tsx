import { Icon } from "@/core/components/icon";

import type { ResourceVM } from "../../lib/ova-job-view-model";
import { markClass, resourceStatusLabel } from "../../lib/progress-view-model";

export function CreationStatusBadge({ resource }: Readonly<{ resource: ResourceVM }>) {
  return (
    <span
      className={`inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border ${markClass(resource.status)}`}
      aria-label={resourceStatusLabel(resource.status)}
    >
      {resource.status === "check" && <Icon name="check-circle" size="text-sm" />}
      {resource.status === "X" && <Icon name="x" size="text-sm" />}
      {(resource.status === "pendiente" || resource.status === "generando") && (
        <span className="inline-flex items-center gap-[3px]" aria-hidden="true">
          <span className="size-[3px] animate-pulse rounded-full bg-current" />
          <span className="size-[3px] animate-pulse rounded-full bg-current [animation-delay:0.15s]" />
          <span className="size-[3px] animate-pulse rounded-full bg-current [animation-delay:0.3s]" />
        </span>
      )}
    </span>
  );
}

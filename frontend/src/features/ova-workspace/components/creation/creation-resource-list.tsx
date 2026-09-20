import { Icon } from "@/core/components/icon";

import { type PhaseGroup } from "../../lib/ova-job-view-model";
import { phaseIconName } from "../../lib/resource-icons";
import { CreationResourceRow } from "./creation-resource-row";

interface Props {
  groups: PhaseGroup[];
  selectedIds: string[];
  activeId: string | null;
  onToggle: (id: string) => void;
  onRetryOne: (id: string) => void;
  onPreview?: (id: string) => void;
}

export function CreationResourceList({ groups, selectedIds, activeId, onToggle, onRetryOne, onPreview }: Readonly<Props>) {
  const selected = new Set(selectedIds);
  return (
    <div className="space-y-4">
      {groups.map((group) => (
        <div key={group.phase}>
          <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <Icon name={phaseIconName(group.phase)} size="text-xs" /> {group.phaseLabel}
          </p>
          <ul className="space-y-1.5">
            {group.items.map((resource) => (
              <CreationResourceRow
                key={resource.id}
                resource={resource}
                selected={selected.has(resource.id)}
                active={activeId === resource.id}
                onToggle={() => {
                  onToggle(resource.id);
                }}
                onRetry={() => {
                  onRetryOne(resource.id);
                }}
                onPreview={
                  onPreview
                    ? () => {
                        onPreview(resource.id);
                      }
                    : undefined
                }
              />
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}

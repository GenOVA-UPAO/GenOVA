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
          <h3 className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
            <Icon name={phaseIconName(group.phase)} className="size-3.5" /> {group.phaseLabel}
          </h3>
          <ul className="divide-y divide-border rounded-lg border border-border">
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

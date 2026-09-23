import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { ResourceVM } from "../../lib/ova-job-view-model";
import { resourceIconName } from "../../lib/resource-icons";
import { CreationStatusBadge } from "./creation-status-badge";

interface Props {
  resource: ResourceVM;
  selected: boolean;
  active: boolean;
  onToggle: () => void;
  onRetry: () => void;
  onPreview?: () => void;
}

export function CreationResourceRow({ resource, selected, active, onToggle, onRetry, onPreview }: Readonly<Props>) {
  const icon = <Icon name={resourceIconName(resource.label)} className="shrink-0" size="text-sm" />;
  return (
    <li className="px-3 py-2">
      <div className="flex items-center gap-2.5">
        {resource.status === "X" && (
          <input
            type="checkbox"
            className="size-4 shrink-0 accent-primary"
            checked={selected}
            onChange={onToggle}
            aria-label={`Seleccionar ${resource.label}`}
          />
        )}
        <CreationStatusBadge resource={resource} />
        {resource.status === "check" && onPreview ? (
          <button
            type="button"
            onClick={onPreview}
            className={`flex-1 min-w-0 inline-flex items-center gap-1.5 text-left text-sm text-foreground hover:text-primary ${active ? "font-semibold text-primary" : ""}`}
          >
            {icon}
            <span className="truncate" title={resource.label}>{resource.label}</span>
          </button>
        ) : (
          <span className="flex-1 min-w-0 inline-flex items-center gap-1.5 text-sm text-muted-foreground">
            {icon}
            <span className="truncate" title={resource.label}>{resource.label}</span>
          </span>
        )}
        {resource.status === "X" && (
          <Button
            variant="outline"
            size="sm"
            className="shrink-0"
            onClick={onRetry}
          >
            Reintentar
          </Button>
        )}
      </div>
      {resource.status === "X" && (
        <p className="mt-1.5 pl-8 text-xs text-destructive">
          No se pudo generar este recurso.
          {resource.error_id && <span className="text-muted-foreground"> Error ID: <span className="font-mono">{resource.error_id}</span></span>}
        </p>
      )}
    </li>
  );
}

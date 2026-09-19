import { Button } from "@/core/components/ui/button";

import type { Resource } from "../../lib/ova-types";
import { MAX_PER_PHASE } from "../../lib/phase-select.config";
import { ResourceCard } from "../phase/resource-card";
import { ResourcePreviewPanel } from "./resource-preview-panel";

interface Props {
  phase: string;
  items: Resource[];
  isPending: boolean;
  selected: Resource[];
  onSelect: (resource: Resource) => void;
  onPreview: (resource: Resource) => void;
  onConfigure: (resource: Resource) => void;
  onReload: () => void;
  preview: Resource | undefined;
}

export function PhaseSelectGrid({ phase, items, isPending, selected, onSelect, onPreview, onConfigure, onReload, preview }: Readonly<Props>) {
  if (isPending) return <p role="status">Cargando recursos…</p>;
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <div className="grid content-start gap-3 sm:grid-cols-2">
        {items.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            selected={selected.some((item) => item.id === resource.id)}
            disabled={selected.length >= MAX_PER_PHASE && !selected.some((item) => item.id === resource.id)}
            onSelect={() => {
              onSelect(resource);
            }}
            onPreview={() => {
              onPreview(resource);
            }}
            onConfigure={() => {
              onConfigure(resource);
            }}
          />
        ))}
        <Button
          variant="ghost"
          onClick={onReload}
        >
          Recargar recursos
        </Button>
      </div>
      <ResourcePreviewPanel phase={phase} resource={preview} />
    </div>
  );
}

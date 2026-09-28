import { usePhaseResources } from "../../hooks/use-phase-resources";
import type { Resource } from "../../lib/ova-types";
import { ResourceCard } from "./resource-card";

interface Props {
  phase: string;
  selected?: Resource;
  onSelect: (resource: Resource) => void;
  onPreview: (resource: Resource) => void;
  onConfigure: (resource: Resource) => void;
}
export function PhaseResourceGrid({ phase, selected, onSelect, onPreview, onConfigure }: Readonly<Props>) {
  const resources = usePhaseResources(phase);
  return (
    <section className="space-y-4 rounded-xl border border-border bg-card p-5">
      <h2 className="font-semibold">1. Elige el tipo de recurso</h2>
      {resources.isPending && <p role="status" className="text-sm text-muted-foreground">Cargando recursos…</p>}
      {resources.error && <p role="alert" className="text-sm text-destructive">{resources.error.message}</p>}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {resources.data?.map((resource) => (
          <ResourceCard
            key={resource.id}
            resource={resource}
            selected={selected?.id === resource.id}
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
      </div>
    </section>
  );
}

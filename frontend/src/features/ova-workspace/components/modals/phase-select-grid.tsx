import { useRef } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";

import type { Resource } from "../../lib/ova-types";
import { phaseMeta } from "../../lib/phase-meta";
import { MAX_PER_PHASE, phaseCfg } from "../../lib/phase-select.config";
import { PhaseSelectCard } from "./phase-select-card";
import { ResourcePreviewPanel } from "./resource-preview-panel";

interface Props {
  phase: string;
  items: Resource[];
  isPending: boolean;
  isFetching: boolean;
  isError: boolean;
  selected: Resource[];
  onSelect: (resource: Resource) => void;
  onPreview: (resource: Resource) => void;
  onConfigure: (resource: Resource) => void;
  onReload: () => void;
  preview: Resource | undefined;
}

const isPicked = (selected: Resource[], resource: Resource) =>
  selected.some((item) => String(item.id) === String(resource.id));

export function PhaseSelectGrid({ phase, items, isPending, isFetching, isError, selected, onSelect, onPreview, onConfigure, onReload, preview }: Readonly<Props>) {
  const previewRef = useRef<HTMLDivElement>(null);
  const full = selected.length >= MAX_PER_PHASE;
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="min-w-0 space-y-3" aria-labelledby="phase-select-heading">
        <div>
          <h3 id="phase-select-heading" className="text-sm font-semibold">{phaseMeta(phase).label}</h3>
          <p className="text-xs text-muted-foreground">
            {phaseCfg(phase)?.sub}. Hasta {MAX_PER_PHASE} recursos por fase.
          </p>
        </div>
        {isPending && (
          <div role="status" aria-label="Cargando recursos" className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((key) => <Skeleton key={key} className="h-36 rounded-xl" />)}
          </div>
        )}
        {isError && (
          <div role="alert" className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 text-sm">
            <span>No se pudieron cargar los recursos de esta fase.</span>
            <Button size="sm" variant="outline" loading={isFetching} onClick={onReload}>
              <Icon name="arrow-clockwise" />
              Reintentar
            </Button>
          </div>
        )}
        {!isPending && !isError && items.length === 0 && (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">No hay recursos disponibles para esta fase.</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {items.map((resource) => (
            <PhaseSelectCard
              key={resource.id}
              resource={resource}
              selected={isPicked(selected, resource)}
              disabled={full && !isPicked(selected, resource)}
              onSelect={() => {
                onSelect(resource);
              }}
              onPreview={() => {
                onPreview(resource);
              }}
              onOpenPreview={() => {
                onPreview(resource);
                previewRef.current?.scrollIntoView({ block: "start", behavior: "smooth" });
              }}
              onConfigure={() => {
                onConfigure(resource);
              }}
            />
          ))}
        </div>
      </section>
      <div ref={previewRef} className="min-w-0 scroll-mt-2 lg:sticky lg:top-0">
        <ResourcePreviewPanel phase={phase} resource={preview} />
      </div>
    </div>
  );
}

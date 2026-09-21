import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import type { Resource } from "../../lib/ova-types";
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

export function PhaseSelectGrid({ phase, items, isPending, isFetching, isError, selected, onSelect, onPreview, onConfigure, onReload, preview }: Readonly<Props>) {
  const previewRef = useRef<HTMLDivElement>(null);
  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <section className="min-w-0 space-y-3" aria-label="Recursos disponibles">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div><h3 className="text-sm font-semibold">{phaseCfg(phase)?.label}</h3><p className="text-xs text-muted-foreground">{phaseCfg(phase)?.sub}</p></div>
          <Button size="sm" variant="outline" disabled={isFetching} onClick={onReload}><Icon name="arrow-clockwise" className={isFetching ? "animate-spin" : undefined} />Recargar recursos</Button>
        </div>
        {isPending && <p role="status" className="rounded-xl border bg-muted/30 p-6 text-sm">Cargando recursos…</p>}
        {isError && <p role="alert" className="rounded-xl border p-4 text-sm">No se pudieron cargar los recursos. Vuelve a intentarlo con «Recargar recursos».</p>}
        {!isPending && !isError && items.length === 0 && <p className="rounded-xl border p-4 text-sm">No hay recursos disponibles para esta fase.</p>}
        <div className="grid gap-3 sm:grid-cols-2">
        {items.map((resource) => (
          <PhaseSelectCard
            key={resource.id}
            resource={resource}
            selected={selected.some((item) => String(item.id) === String(resource.id))}
            disabled={selected.length >= MAX_PER_PHASE && !selected.some((item) => String(item.id) === String(resource.id))}
            onSelect={() => {
              onSelect(resource);
            }}
            onPreview={() => {
              onPreview(resource);
            }}
            onOpenPreview={() => {
              onPreview(resource);
              if (window.matchMedia("(max-width: 1023px)").matches) previewRef.current?.scrollIntoView({ block: "start" });
            }}
            onConfigure={() => {
              onConfigure(resource);
            }}
          />
        ))}
        </div>
      </section>
      <div ref={previewRef} className="min-w-0 lg:sticky lg:top-0"><ResourcePreviewPanel phase={phase} resource={preview} /></div>
    </div>
  );
}
import { useRef } from "react";

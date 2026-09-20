import { lazy, Suspense, useEffect, useState } from "react";

import { useGeneratePhaseResource, usePhaseResources } from "../../hooks/use-phase-resources";
import { useResourceConfigs } from "../../hooks/use-resource-configs";
import type { Resource } from "../../lib/ova-types";
import { ResourcePreviewPanel } from "../modals/resource-preview-panel";
import { HtmlPreview } from "./html-preview";
import { PhaseConceptForm } from "./phase-concept-form";
import { PhaseResourceGrid } from "./phase-resource-grid";

const ResourceConfigModal = lazy(() => import("../modals/resource-config-modal"));

export function PhasePage({ phase, description }: Readonly<{ phase: string; description: string }>) {
  const resources = usePhaseResources(phase);
  const configs = useResourceConfigs();
  const generation = useGeneratePhaseResource();
  const [selected, setSelected] = useState<Resource>();
  const [hovered, setHovered] = useState<Resource>();
  const [target, setTarget] = useState<Resource>();
  const preview = hovered ?? selected;
  useEffect(() => {
    if (!generation.data) return;
    document.getElementById("phase-resource-preview")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [generation.data]);
  return (
    <div className="h-full overflow-y-auto">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
      <header>
        <h1 className="font-display text-3xl font-semibold sm:text-4xl">Fase {phase.toUpperCase()}</h1>
        <p className="mt-1.5 text-sm font-medium text-muted-foreground">{description}</p>
      </header>
      <div className="grid gap-6 lg:grid-cols-[1fr_320px]">
        <div className="min-w-0 space-y-6">
          <PhaseResourceGrid
            phase={phase}
            selected={selected}
            onSelect={(resource) => {
              setSelected(resource);
              generation.reset();
            }}
            onPreview={setHovered}
            onConfigure={setTarget}
          />
          <PhaseConceptForm phase={phase} resource={selected} generation={generation} />
          {generation.data && (
            <section id="phase-resource-preview" className="space-y-4 rounded-xl border bg-card p-5">
              <h2 className="font-semibold">3. Vista previa</h2>
              <HtmlPreview result={generation.data} />
            </section>
          )}
        </div>
        <div className="space-y-4">
          <ResourcePreviewPanel phase={phase} resource={preview ?? resources.data?.[0]} />
          <section className="rounded-xl border bg-card p-5">
            <h2 className="font-display text-lg">Modelo 5E</h2>
            <p>Engage · Explore · Explain · Elaborate · Evaluate</p>
          </section>
        </div>
      </div>
      {target && (
        <Suspense>
          <ResourceConfigModal
            phase={phase}
            resourceId={String(target.id)}
            config={configs.data?.configs?.[`${phase}:${String(target.id)}`]}
            onSave={(value) => {
              configs.save.mutate({ ...configs.data?.configs, [`${phase}:${String(target.id)}`]: value });
            }}
            onClose={() => {
              setTarget(undefined);
            }}
          />
        </Suspense>
      )}
      </div>
    </div>
  );
}

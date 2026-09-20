import { useState } from "react";

import { Button } from "@/core/components/ui/button";

import type { useGeneratePhaseResource } from "../../hooks/use-phase-resources";
import type { Resource } from "../../lib/ova-types";

export function PhaseConceptForm({
  phase,
  resource,
  generation,
}: Readonly<{ phase: string; resource?: Resource; generation: ReturnType<typeof useGeneratePhaseResource> }>) {
  const [concept, setConcept] = useState("");
  return (
    <section className="space-y-4 rounded-xl border bg-card p-5">
      <h2 className="font-semibold">2. Define el concepto</h2>
      <label htmlFor="phase-concept" className="sr-only">
        Concepto
      </label>
      <input
        id="phase-concept"
        className="w-full rounded border bg-background p-3"
        value={concept}
        disabled={generation.isPending}
        onChange={(event) => {
          setConcept(event.target.value);
          generation.reset();
        }}
        placeholder="Ej: K-Means, Regresión Lineal, Redes Neuronales..."
      />
      <Button
        disabled={!resource || !concept.trim() || generation.isPending}
        onClick={() => {
          generation.mutate({ phase, resourceId: resource?.id, concept });
        }}
      >
        Generar recurso
      </Button>
      {generation.isPending && <p role="status">La IA está generando el recurso; esto puede tomar 20-60 segundos.</p>}
      {generation.error && <p role="alert">{generation.error.message}</p>}
    </section>
  );
}

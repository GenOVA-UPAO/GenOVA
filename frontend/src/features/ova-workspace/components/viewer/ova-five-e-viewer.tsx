import { useState } from "react";

import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";
import { Button } from "@/core/components/ui/button";

import { resourceLabel } from "../../lib/resource-label";
import type { PhaseWithContent } from "../../lib/types";

export default function OvaFiveEViewer({ phases }: Readonly<{ phases: PhaseWithContent[] }>) {
  const [id, setId] = useState(phases[0]?.id);
  const active = phases.find((phase) => phase.id === id) ?? phases.at(0);
  return (
    <div className="min-w-0 space-y-4">
      <nav className="flex flex-wrap gap-2" aria-label="Recursos del OVA">
        {phases.map((phase) => (
          <Button
            key={phase.id}
            size="sm"
            variant={active?.id === phase.id ? "default" : "outline"}
            onClick={() => {
              setId(phase.id);
            }}
          >
            {resourceLabel(phase)}
          </Button>
        ))}
      </nav>
      {active ? <HtmlPreviewFrame html={active.content} title={resourceLabel(active)} /> : <p>No hay recursos disponibles.</p>}
    </div>
  );
}

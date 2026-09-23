import type { DragEvent } from "react";
import { lazy, Suspense, useState } from "react";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { usePhaseDrag } from "../../hooks/use-phase-drag";
import { phaseMeta } from "../../lib/phase-meta";
import { applyReorder } from "../../lib/resource-reorder";
import type { PhaseWithContent } from "../../lib/types";
import { WorkspaceResourceRow } from "./workspace-resource-row";

const AddResourceModal = lazy(() => import("../modals/add-resource-modal"));

const MAX_PHASES_PER_TYPE = 4;

interface RowProps {
  draggable: true;
  onDragStart: (event: DragEvent<HTMLLIElement>) => void;
  onDragOver: (event: DragEvent<HTMLLIElement>) => void;
  onDrop: (event: DragEvent<HTMLLIElement>) => void;
  onDragEnd: () => void;
}

interface Props {
  phases: PhaseWithContent[];
  phaseType: string;
  ovaId: string;
  onReorder: (next: PhaseWithContent[]) => void;
  onRegenerate: (phase: PhaseWithContent) => void;
}

export function WorkspaceResourceList({ phases, phaseType, ovaId, onReorder, onRegenerate }: Readonly<Props>) {
  const drag = usePhaseDrag(phases, onReorder);
  const [adding, setAdding] = useState(false);
  const label = phaseMeta(phaseType).label || phaseType;
  const heading = `phase-section-${phaseType}`;
  const full = phases.length >= MAX_PHASES_PER_TYPE;
  const move = (index: number, offset: number) => {
    const to = index + offset;
    if (to < 0 || to >= phases.length) return;
    onReorder(applyReorder(phases, index, to));
  };
  return (
    <section aria-labelledby={heading} className="space-y-2">
      <div className="flex items-center justify-between gap-2">
        <h2 id={heading} className="text-sm font-semibold text-foreground">
          {label}
          <span className="ml-2 text-xs font-normal tabular-nums text-muted-foreground">
            {phases.length} de {MAX_PHASES_PER_TYPE}
          </span>
        </h2>
        {full ? (
          <span className="text-xs text-muted-foreground">Máximo de recursos alcanzado</span>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            aria-label={`Añadir recurso a ${label}`}
            onClick={() => {
              setAdding(true);
            }}
          >
            <Icon name="plus" />
            Añadir recurso
          </Button>
        )}
      </div>
      <ul className="space-y-3">
        {phases.map((phase, index) => (
          <WorkspaceResourceRow
            key={phase.id}
            phase={phase}
            index={index}
            total={phases.length}
            ovaId={ovaId}
            dragging={drag.dragging === index}
            dragProps={drag.liProps(index) as RowProps}
            onMove={move}
            onRegenerate={onRegenerate}
          />
        ))}
      </ul>
      {adding && (
        <Suspense>
          <AddResourceModal
            ovaId={ovaId}
            phaseType={phaseType}
            currentCount={phases.length}
            onClose={() => {
              setAdding(false);
            }}
          />
        </Suspense>
      )}
    </section>
  );
}

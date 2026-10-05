import type { DragEvent } from "react";
import { lazy, Suspense, useState } from "react";
import { useTranslation } from "react-i18next";

import { usePhaseDrag } from "../../hooks/use-phase-drag";
import { phaseMeta } from "../../lib/phase-meta";
import { applyReorder } from "../../lib/resource-reorder";
import type { PhaseWithContent } from "../../lib/types";
import { ResourceListHeader } from "./resource-list-header";
import { WorkspaceResourceRow } from "./workspace-resource-row";

const AddResourceModal = lazy(() => import("../modals/add-resource-modal"));

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
  busy: boolean;
  onReorder: (next: PhaseWithContent[]) => void;
  onRegenerate: (phase: PhaseWithContent) => void;
  /** Recurso recién añadido (aún con su marcador): lo genera la regeneración. */
  onAdded: (phase: PhaseWithContent, instructions: string) => void;
}

export function WorkspaceResourceList({
  phases,
  phaseType,
  ovaId,
  busy,
  onReorder,
  onRegenerate,
  onAdded,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const drag = usePhaseDrag(phases, onReorder);
  const [adding, setAdding] = useState(false);
  const label = phaseMeta(phaseType, t).label || phaseType;
  const heading = `phase-section-${phaseType}`;
  const move = (index: number, offset: number) => {
    const to = index + offset;
    if (to < 0 || to >= phases.length) return;
    onReorder(applyReorder(phases, index, to));
  };
  return (
    <section aria-labelledby={heading} className="space-y-2">
      <ResourceListHeader
        headingId={heading}
        label={label}
        count={phases.length}
        busy={busy}
        onAdd={() => {
          setAdding(true);
        }}
      />
      {phases.length === 0 && (
        <p className="rounded-lg border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
          {t("workspace:emptyPhaseHint")} </p>
      )}
      <ul className="space-y-3">
        {phases.map((phase, index) => (
          <WorkspaceResourceRow
            key={phase.id}
            phase={phase}
            index={index}
            total={phases.length}
            ovaId={ovaId}
            busy={busy}
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
            onAdded={onAdded}
            onClose={() => {
              setAdding(false);
            }}
          />
        </Suspense>
      )}
    </section>
  );
}

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

import { resourceLabel } from "../../lib/resource-label";
import type { PhaseWithContent } from "../../lib/types";
import { WorkspacePhaseItem } from "./workspace-phase-item";

interface DragProps {
  draggable: boolean;
  onDragStart: (event: React.DragEvent<HTMLLIElement>) => void;
  onDragOver: (event: React.DragEvent<HTMLLIElement>) => void;
  onDrop: (event: React.DragEvent<HTMLLIElement>) => void;
  onDragEnd: () => void;
}

interface Props {
  phase: PhaseWithContent;
  index: number;
  total: number;
  ovaId: string;
  dragging: boolean;
  dragProps: DragProps;
  onMove: (index: number, offset: number) => void;
  onRegenerate: (phase: PhaseWithContent) => void;
}

export function WorkspaceResourceRow({ phase, index, total, ovaId, dragging, dragProps, onMove, onRegenerate }: Readonly<Props>) {
  const name = resourceLabel(phase);
  return (
    <li className={`flex items-stretch gap-1 ${dragging ? "opacity-50" : ""}`} {...dragProps}>
      <div className="flex flex-col justify-center gap-0.5">
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          disabled={index === 0}
          aria-label={`Subir ${name}`}
          onClick={() => {
            onMove(index, -1);
          }}
        >
          <Icon name="caret-up" size="text-xs" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="text-muted-foreground"
          disabled={index === total - 1}
          aria-label={`Bajar ${name}`}
          onClick={() => {
            onMove(index, 1);
          }}
        >
          <Icon name="caret-down" size="text-xs" />
        </Button>
      </div>
      <div className="min-w-0 flex-1">
        <WorkspacePhaseItem
          ovaId={ovaId}
          phase={phase}
          onRegenerate={() => {
            onRegenerate(phase);
          }}
        />
      </div>
    </li>
  );
}

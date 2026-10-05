import { useTranslation } from "react-i18next";

import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { Tooltip } from "@/core/components/ui/tooltip";

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
  busy: boolean;
  dragging: boolean;
  dragProps: DragProps;
  onMove: (index: number, offset: number) => void;
  onRegenerate: (phase: PhaseWithContent) => void;
}

export function WorkspaceResourceRow({
  phase,
  index,
  total,
  ovaId,
  busy,
  dragging,
  dragProps,
  onMove,
  onRegenerate,
}: Readonly<Props>) {
  const { t } = useTranslation();
  const name = resourceLabel(phase);
  return (
    <li className={dragging ? "opacity-50" : undefined} {...dragProps}>
      <WorkspacePhaseItem
        ovaId={ovaId}
        phase={phase}
        busy={busy}
        onRegenerate={() => {
          onRegenerate(phase);
        }}
        reorder={
          total > 1 && (
            <span className="flex shrink-0 items-center">
              <Tooltip label={t("workspace:subir")} side="top">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  disabled={index === 0}
                  aria-label={t("workspace:subir_value", { p0: name })}
                  onClick={() => {
                    onMove(index, -1);
                  }}
                >
                  <Icon name="caret-up" />
                </Button>
              </Tooltip>
              <Tooltip label={t("workspace:bajar")} side="top">
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  disabled={index === total - 1}
                  aria-label={t("workspace:bajar_value", { p0: name })}
                  onClick={() => {
                    onMove(index, 1);
                  }}
                >
                  <Icon name="caret-down" />
                </Button>
              </Tooltip>
            </span>
          )
        }
      />
    </li>
  );
}

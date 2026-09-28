import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

import { selectionSummary } from "../../lib/creation-guidance";
import { ModalActions } from "../shared/modal-actions";

interface Props {
  count: number;
  phases: number;
  onClose: () => void;
  onConfirm: () => void;
}

function requirement(phases: number): string {
  return phases === 0
    ? "Elige recursos en al menos 2 fases para confirmar."
    : "Elige recursos en 1 fase más para confirmar.";
}

export function PhaseSelectFooter({ count, phases, onClose, onConfirm }: Readonly<Props>) {
  const valid = phases >= 2;
  return (
    <ModalActions
      status={
        <div role="status">
          <p className={cn("flex items-center gap-1.5 font-medium", valid ? "text-foreground" : "text-muted-foreground")}>
            <Icon name={valid ? "check-circle" : "info"} className={cn("size-4 shrink-0", valid && "text-success")} />
            {selectionSummary(count, phases)}
          </p>
          {!valid && (
            <p id="phase-select-requirement" className="mt-0.5 text-xs">
              {requirement(phases)}
            </p>
          )}
        </div>
      }
    >
      <Button variant="outline" onClick={onClose}>
        Cancelar
      </Button>
      <Button disabled={!valid} aria-describedby={valid ? undefined : "phase-select-requirement"} onClick={onConfirm}>
        Confirmar ({count})
      </Button>
    </ModalActions>
  );
}

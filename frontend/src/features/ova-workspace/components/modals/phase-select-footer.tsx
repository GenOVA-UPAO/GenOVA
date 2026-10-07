import { useTranslation } from "react-i18next";

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
    ? "workspace:elige_recursos_en_al_menos_2_fases_para_confirmar"
    : "workspace:elige_recursos_en_1_fase_mas_para_confirmar";
}

export function PhaseSelectFooter({ count, phases, onClose, onConfirm }: Readonly<Props>) {
  const { t } = useTranslation();
  const valid = phases >= 2;
  return (
    <ModalActions
      status={
        <div role="status">
          <p className={cn("flex items-center gap-1.5 font-medium", valid ? "text-foreground" : "text-muted-foreground")}>
            <Icon name={valid ? "check-circle" : "info"} className={cn("size-4 shrink-0", valid && "text-success")} />
            {count === 0 ? t(requirement(phases)) : selectionSummary(count, phases, t)}
          </p>
          {!valid && count > 0 && (
            <p id="phase-select-requirement" className="mt-0.5 text-xs">
              {t(requirement(phases))}
            </p>
          )}
        </div>
      }
    >
      <Button variant="outline" onClick={onClose}>
        {t("workspace:cancelar")} </Button>
      <Button disabled={!valid} aria-describedby={valid ? undefined : "phase-select-requirement"} onClick={onConfirm}>
        {t("workspace:confirmar")}{count})
      </Button>
    </ModalActions>
  );
}

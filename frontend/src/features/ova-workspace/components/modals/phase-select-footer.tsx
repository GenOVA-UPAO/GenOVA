import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";

interface Props {
  count: number;
  phases: number;
  onClose: () => void;
  onConfirm: () => void;
}

export function PhaseSelectFooter({ count, phases, onClose, onConfirm }: Readonly<Props>) {
  const valid = phases >= 2;
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div role="status" className="text-sm">
        <p className="flex items-center gap-2 font-medium"><Icon name={valid ? "check-circle" : "info"} />{count} recursos · {phases} fases</p>
        {!valid && <p id="phase-select-requirement" className="mt-1 text-xs text-muted-foreground">Selecciona recursos en al menos 2 fases</p>}
      </div>
      <div className="flex gap-2">
        <Button className="flex-1 sm:flex-none" variant="outline" onClick={onClose}>Cancelar</Button>
        <Button className="flex-1 sm:flex-none" disabled={!valid} aria-describedby={valid ? undefined : "phase-select-requirement"} onClick={onConfirm}>Confirmar ({count})</Button>
      </div>
    </div>
  );
}

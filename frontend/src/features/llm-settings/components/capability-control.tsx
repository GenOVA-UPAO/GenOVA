import type { EngineNode } from "../hooks/nodes-config.types";
import { FlagSwitch } from "./flag-switch";

interface CapabilityControlProps {
  cap: EngineNode;
  active: boolean;
  saving: boolean;
  onToggle: () => void;
}

export function CapabilityControl({
  cap,
  active,
  saving,
  onToggle,
}: Readonly<CapabilityControlProps>) {
  if (cap.always_on) return <span className="text-sm text-muted-foreground">Siempre activo</span>;
  return (
    <>
      <span className="text-sm text-muted-foreground" aria-hidden="true">
        {active ? "Activo" : "Pausado"}
      </span>
      <FlagSwitch checked={active} disabled={saving} label={cap.name} onToggle={onToggle} />
    </>
  );
}

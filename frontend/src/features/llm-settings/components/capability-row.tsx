import type { EngineNode } from "../hooks/nodes-config.types";
import { CapabilityControl } from "./capability-control";
import { SettingRow } from "./setting-row";

interface CapabilityRowProps {
  cap: EngineNode;
  active: boolean;
  saving: boolean;
  videoWarning: boolean;
  onToggle: () => void;
}

export function CapabilityRow({
  cap,
  active,
  saving,
  videoWarning,
  onToggle,
}: Readonly<CapabilityRowProps>) {
  return (
    <SettingRow
      title={
        <>
          {cap.name}
          {cap.role ? <span className="font-normal text-muted-foreground">{cap.role}</span> : null}
          {/* Sin clave no es un fallo: la descripción ya dice que entrega el guion. */}
          {cap.id === "video" && videoWarning ? (
            <span className="font-normal text-muted-foreground">Sin clave API</span>
          ) : null}
        </>
      }
      description={cap.description}
      control={<CapabilityControl cap={cap} active={active} saving={saving} onToggle={onToggle} />}
    />
  );
}

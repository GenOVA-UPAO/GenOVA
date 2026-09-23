import { Icon } from "@/core/components/icon";

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
          {cap.id === "video" && videoWarning ? (
            <span className="inline-flex items-center gap-1 font-normal text-accent-brand">
              <Icon name="warning" size="text-sm" /> Falta su clave API
            </span>
          ) : null}
        </>
      }
      description={cap.description}
      control={<CapabilityControl cap={cap} active={active} saving={saving} onToggle={onToggle} />}
    />
  );
}

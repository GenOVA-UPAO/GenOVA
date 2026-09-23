import { Input } from "@/core/components/ui/input";
import { Label } from "@/core/components/ui/label";

import type { EngineNode } from "../hooks/nodes-config.types";
import { FlagSwitch } from "./flag-switch";
import { SettingRow } from "./setting-row";

interface ConfigurableNodeRowProps {
  node: EngineNode;
  active: boolean;
  showParam: boolean;
  rounds: number;
  saving: boolean;
  onToggle: () => void;
  onRounds: (value: number) => void;
}

export function ConfigurableNodeRow({
  node,
  active,
  showParam,
  rounds,
  saving,
  onToggle,
  onRounds,
}: Readonly<ConfigurableNodeRowProps>) {
  return (
    <SettingRow
      title={
        <>
          {node.name}
          {node.role ? <span className="font-normal text-muted-foreground">{node.role}</span> : null}
        </>
      }
      description={node.description}
      control={
        <>
          <span className="text-sm text-muted-foreground" aria-hidden="true">
            {active ? "Activo" : "Pausado"}
          </span>
          <FlagSwitch checked={active} disabled={saving} label={node.name} onToggle={onToggle} />
        </>
      }
    >
      {node.param && showParam ? (
        <div className="flex items-center gap-3">
          <Label htmlFor={`rounds-${node.id}`} className="font-normal text-muted-foreground">
            {node.param.label}
          </Label>
          <Input
            id={`rounds-${node.id}`}
            type="number"
            min={node.param.min}
            max={node.param.max}
            value={rounds}
            disabled={saving}
            onChange={(event) => {
              onRounds(Number(event.target.value));
            }}
            className="w-20 text-center tabular-nums"
          />
        </div>
      ) : null}
    </SettingRow>
  );
}

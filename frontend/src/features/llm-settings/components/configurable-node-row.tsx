import { Label } from "@/core/components/ui/label";
import { cn } from "@/core/lib/cn";

import type { EngineNode } from "../hooks/nodes-config.types";
import { FlagSwitch } from "./flag-switch";
import { getNodeInitials } from "./platform-nodes-card.helpers";

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
    <div className="flex flex-col justify-between gap-4 border-b border-border/50 px-6 py-4 transition-colors last:border-0 hover:bg-accent/30 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary shadow-sm">
          <span className="text-sm font-bold text-white uppercase">{getNodeInitials(node.name)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold text-foreground">{node.name}</span>
            {node.role ? (
              <span className="rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                {node.role}
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug font-medium text-muted-foreground">
            {node.description}
          </p>
        </div>
      </div>
      <div className="mt-3 flex shrink-0 items-center gap-4 sm:mt-0">
        {node.param && showParam ? (
          <div className="flex items-center gap-2 rounded-xl border border-border/50 bg-muted/20 px-3 py-1.5 shadow-sm">
            <Label htmlFor={`rounds-${node.id}`} className="text-xs font-bold text-muted-foreground">
              {node.param.label}
            </Label>
            <input
              id={`rounds-${node.id}`}
              type="number"
              min={node.param.min}
              max={node.param.max}
              value={rounds}
              disabled={saving}
              onChange={(event) => {
                onRounds(Number(event.target.value));
              }}
              className="w-14 rounded-lg border border-border bg-background px-2 py-1 text-center font-mono text-sm font-bold outline-none focus:ring-2 focus:ring-primary/20"
            />
          </div>
        ) : null}
        <div className="flex items-center gap-3">
          <span
            className={cn(
              "text-[10px] font-bold tracking-widest uppercase",
              active ? "text-emerald-600" : "text-muted-foreground",
            )}
          >
            {active ? "Activo" : "Pausado"}
          </span>
          <FlagSwitch checked={active} disabled={saving} onToggle={onToggle} />
        </div>
      </div>
    </div>
  );
}

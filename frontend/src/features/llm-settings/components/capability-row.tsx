import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import type { EngineNode } from "../hooks/nodes-config.types";
import { FlagSwitch } from "./flag-switch";
import { getNodeInitials } from "./platform-nodes-card.helpers";

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
    <div className="flex flex-col justify-between gap-4 border-b border-border/50 px-6 py-4 transition-colors last:border-0 hover:bg-accent/30 sm:flex-row sm:items-center">
      <div className="flex min-w-0 flex-1 items-center gap-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-primary/20 bg-primary/80 shadow-sm">
          <span className="text-sm font-bold text-white uppercase">{getNodeInitials(cap.name)}</span>
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-sm font-bold text-foreground">{cap.name}</span>
            {cap.role ? (
              <span className="rounded-md border border-border/50 bg-muted/50 px-1.5 py-0.5 text-[9px] font-bold tracking-widest text-muted-foreground uppercase">
                {cap.role}
              </span>
            ) : null}
            {cap.id === "video" && videoWarning ? (
              <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-amber-700 uppercase">
                <Icon name="warning" size="text-[10px]" /> API Key faltante
              </span>
            ) : null}
          </div>
          <p className="mt-0.5 text-[11px] leading-snug font-medium text-muted-foreground">
            {cap.description}
          </p>
        </div>
      </div>
      <div className="flex shrink-0 items-center gap-3">
        {cap.always_on ? (
          <span className="rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold tracking-widest text-emerald-600 uppercase shadow-sm">
            Siempre activo
          </span>
        ) : (
          <>
            <span
              className={cn(
                "text-[10px] font-bold tracking-widest uppercase",
                active ? "text-emerald-600" : "text-muted-foreground",
              )}
            >
              {active ? "Activo" : "Pausado"}
            </span>
            <FlagSwitch checked={active} disabled={saving} onToggle={onToggle} />
          </>
        )}
      </div>
    </div>
  );
}

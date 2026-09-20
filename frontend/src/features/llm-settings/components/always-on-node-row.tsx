import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import type { EngineNode } from "../hooks/nodes-config.types";
import { getNodeBadgeColor, getNodeInitials } from "./platform-nodes-card.helpers";

interface AlwaysOnNodeRowProps {
  node: EngineNode;
  warning?: boolean;
}

export function AlwaysOnNodeRow({ node, warning = false }: Readonly<AlwaysOnNodeRowProps>) {
  return (
    <div className="flex items-center gap-4 border-b border-border/50 px-6 py-4 transition-colors last:border-0 hover:bg-accent/30">
      <div
        className={cn(
          "flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-black/10 shadow-sm",
          getNodeBadgeColor(node.name, warning),
        )}
      >
        <span className="text-sm font-bold text-white uppercase">{getNodeInitials(node.name)}</span>
      </div>
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-2 text-sm font-bold text-foreground">
          {node.name}
          {warning ? (
            <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold tracking-widest text-amber-700 uppercase">
              <Icon name="warning" size="text-[10px]" /> API Key faltante
            </span>
          ) : null}
        </p>
        <p className="mt-0.5 text-[11px] font-medium text-muted-foreground">
          {node.description ?? "Nodo base del sistema."}
        </p>
      </div>
      <span className="mr-2 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-1 text-[10px] font-bold tracking-widest text-emerald-700 uppercase shadow-sm dark:text-emerald-400">
        Siempre activo
      </span>
    </div>
  );
}

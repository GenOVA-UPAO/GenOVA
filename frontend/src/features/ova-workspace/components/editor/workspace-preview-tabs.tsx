import { cn } from "@/core/lib/cn";

import type { PhaseWithContent } from "../../lib/types";

interface Props {
  phases: PhaseWithContent[];
  labels: Map<string, string>;
  activeId: string | null;
  onSelect: (id: string) => void;
}

function tabClass(active: boolean): string {
  return cn(
    "relative shrink-0 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active
      ? "bg-background font-semibold text-foreground shadow-sm ring-1 ring-border after:absolute after:inset-x-2 after:-bottom-1 after:h-0.5 after:rounded-full after:bg-primary"
      : "text-muted-foreground hover:bg-muted/70 hover:text-foreground",
  );
}

export function WorkspacePreviewTabs({ phases, labels, activeId, onSelect }: Readonly<Props>) {
  return (
    <nav aria-label="Recursos del OVA" className="min-w-0 shrink-0 border-b border-border bg-muted/30">
      <div className="flex gap-1 overflow-x-auto overscroll-x-contain px-3 py-2 [scrollbar-width:thin]">
        {phases.map((phase) => {
          const active = phase.id === activeId;
          return (
            <button
              key={phase.id}
              type="button"
              aria-current={active ? "true" : undefined}
              onClick={() => {
                onSelect(phase.id);
              }}
              className={tabClass(active)}
            >
              {labels.get(phase.id) ?? phase.phase_type}
            </button>
          );
        })}
      </div>
    </nav>
  );
}

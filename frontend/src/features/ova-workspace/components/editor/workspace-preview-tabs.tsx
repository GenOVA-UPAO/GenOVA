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
    "relative inline-flex h-11 max-w-60 shrink-0 items-center px-3 text-sm whitespace-nowrap transition-colors duration-150",
    "outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full after:transition-colors",
    active
      ? "font-semibold text-foreground after:bg-primary"
      : "font-medium text-muted-foreground after:bg-transparent hover:text-foreground",
  );
}

/** Pestañas de recursos del visor: subrayado primario en la activa, scroll horizontal si no caben. */
export function WorkspacePreviewTabs({ phases, labels, activeId, onSelect }: Readonly<Props>) {
  return (
    <nav aria-label="Recursos del OVA" className="min-w-0 shrink-0 border-b border-border">
      <div className="flex overflow-x-auto overscroll-x-contain px-1 [scrollbar-width:thin]">
        {phases.map((phase) => {
          const active = phase.id === activeId;
          const label = labels.get(phase.id) ?? phase.phase_type;
          return (
            <button
              key={phase.id}
              type="button"
              aria-current={active ? "true" : undefined}
              title={label}
              onClick={() => {
                onSelect(phase.id);
              }}
              className={tabClass(active)}
            >
              <span className="truncate">{label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

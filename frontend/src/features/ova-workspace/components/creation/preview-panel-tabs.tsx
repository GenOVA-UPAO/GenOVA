import { cn } from "@/core/lib/cn";

import type { ResourceVM } from "../../lib/ova-job-view-model";

interface Props {
  done: ResourceVM[];
  pending: ResourceVM[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
}

function tabClass(active: boolean): string {
  return cn(
    "relative inline-flex h-11 shrink-0 items-center px-3 text-sm whitespace-nowrap transition-colors duration-150",
    "outline-none focus-visible:rounded-md focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
    "after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:rounded-full",
    active ? "font-semibold text-foreground after:bg-primary" : "font-medium text-muted-foreground hover:text-foreground",
  );
}

/** Mismo estilo que las pestañas del visor; los recursos aún en cola se ven atenuados. */
export function PreviewPanelTabs({ done, pending, activeId, onSelect }: Readonly<Props>) {
  return (
    <nav aria-label="Recursos generados" className="flex shrink-0 overflow-x-auto border-b border-border px-1 [scrollbar-width:thin]">
      {done.map((resource) => (
        <button
          key={resource.id}
          type="button"
          aria-current={resource.id === activeId ? "true" : undefined}
          onClick={() => {
            onSelect(resource.id);
          }}
          className={tabClass(resource.id === activeId)}
        >
          {resource.label || resource.phase}
        </button>
      ))}
      {pending.map((resource) => (
        <span key={resource.id} className="inline-flex h-11 shrink-0 items-center px-3 text-sm whitespace-nowrap text-muted-foreground/60">
          {resource.label || resource.phase}
          <span className="sr-only"> (generando)</span>
        </span>
      ))}
    </nav>
  );
}

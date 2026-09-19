import type { ResourceVM } from "../../lib/ova-job-view-model";

interface Props {
  done: ResourceVM[];
  pending: ResourceVM[];
  activeId: string | undefined;
  onSelect: (id: string) => void;
}

export function PreviewPanelTabs({ done, pending, activeId, onSelect }: Readonly<Props>) {
  return (
    <nav aria-label="Recursos generados" className="flex shrink-0 flex-wrap gap-1 border-b border-border bg-muted/20 px-3 py-2">
      {done.map((resource) => (
        <button
          key={resource.id}
          type="button"
          onClick={() => {
            onSelect(resource.id);
          }}
          className={`flex items-center gap-1 rounded-md border px-3 py-1 text-xs font-medium transition-colors ${resource.id === activeId ? "bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground"}`}
        >
          {resource.emoji && <span>{resource.emoji}</span>}
          {resource.label || resource.phase}
        </button>
      ))}
      {pending.map((resource) => (
        <span
          key={resource.id}
          className="flex items-center gap-1 rounded-md border border-dashed border-border px-3 py-1 text-xs text-muted-foreground/50"
        >
          <span className="inline-block h-2 w-2 animate-pulse rounded-full border border-current" />
          {resource.label || resource.phase}
        </span>
      ))}
    </nav>
  );
}

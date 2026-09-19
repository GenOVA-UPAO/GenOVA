import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import { taskMeta } from "../lib/task-meta";

interface ModelsTaskTabProps {
  task: string;
  selected: boolean;
  subtitle: string;
  onSelect: (task: string) => void;
}

export function ModelsTaskTab({ task, selected, subtitle, onSelect }: Readonly<ModelsTaskTabProps>) {
  const meta = taskMeta(task);
  return (
    <button
      type="button"
      role="tab"
      id={`task-tab-${task}`}
      aria-controls={`task-panel-${task}`}
      aria-selected={selected}
      tabIndex={selected ? 0 : -1}
      onClick={() => {
        onSelect(task);
      }}
      className={cn(
        "flex w-full min-w-[9.5rem] items-center gap-2.5 rounded-md border border-transparent px-2.5 py-2 text-left transition-colors hover:bg-muted/60 md:min-w-0",
        selected && "border-border bg-muted",
      )}
      style={selected ? { boxShadow: "inset 3px 0 0 var(--primary, #0A3D91)" } : undefined}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border bg-muted/50 text-[11px] font-bold"
        aria-hidden="true"
      >
        {meta.iconName ? <Icon name={meta.iconName} size="text-sm" /> : meta.icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-semibold text-foreground">{meta.label}</span>
        <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{subtitle}</span>
      </span>
    </button>
  );
}

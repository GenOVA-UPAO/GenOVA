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
        "relative flex w-full min-w-[9.5rem] items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/60 focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none md:min-w-0",
        selected &&
          "bg-primary/8 before:absolute before:inset-y-2 before:left-0 before:w-0.5 before:rounded-full before:bg-primary hover:bg-primary/8 dark:bg-primary/15",
      )}
    >
      <span
        className={cn(
          "flex size-8 shrink-0 items-center justify-center rounded-lg text-xs font-bold",
          selected ? "bg-primary/10 text-primary dark:bg-primary/20" : "bg-muted text-muted-foreground",
        )}
        aria-hidden="true"
      >
        {meta.iconName ? <Icon name={meta.iconName} size="text-sm" /> : meta.icon}
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-foreground">{meta.label}</span>
        <span className="mt-0.5 block truncate text-xs text-muted-foreground" title={subtitle}>
          {subtitle}
        </span>
      </span>
    </button>
  );
}

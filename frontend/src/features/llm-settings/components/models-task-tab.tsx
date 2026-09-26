import { Icon } from "@/core/components/icon";
import { cn } from "@/core/lib/cn";

import { joinList } from "../lib/join-list";
import { taskMeta } from "../lib/task-meta";

interface ModelsTaskTabProps {
  task: string;
  selected: boolean;
  subtitle: string;
  /** Otras tareas con el mismo modelo principal. */
  shared?: string[];
  onSelect: (task: string) => void;
}

export function ModelsTaskTab({ task, selected, subtitle, shared = [], onSelect }: Readonly<ModelsTaskTabProps>) {
  const meta = taskMeta(task);
  return (
    <button
      type="button"
      role="tab"
      id={`task-tab-${task}`}
      aria-controls={`task-panel-${task}`}
      aria-selected={selected}
      // El «igual que…» describe, no nombra: así «Código» no coincide con la pestaña Texto.
      aria-describedby={shared.length > 0 ? `task-tab-${task}-shared` : undefined}
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
        <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
          <span className="truncate" title={subtitle}>
            {subtitle}
          </span>
          {shared.length > 0 ? (
            <span className="inline-flex shrink-0" title={`Igual que ${joinList(shared)}`}>
              <Icon name="link" size="text-xs" />
              <span id={`task-tab-${task}-shared`} hidden>
                Mismo modelo que {joinList(shared)}
              </span>
            </span>
          ) : null}
        </span>
      </span>
    </button>
  );
}

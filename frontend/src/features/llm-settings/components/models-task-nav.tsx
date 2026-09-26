import { cn } from "@/core/lib/cn";

import type { Draft } from "../lib/llm-config-draft";
import { chipLabel, type ChipModel } from "../lib/model-task-card.helpers";
import { sharedWith, sharingSummary } from "../lib/task-sharing";
import type { EnabledModel } from "../lib/user-llm-settings.types";
import { ModelsTaskTab } from "./models-task-tab";

interface ModelsTaskNavProps {
  tasks: string[];
  selectedTask: string;
  draft: Draft | null;
  adminModels: ChipModel[];
  defaults: Record<string, EnabledModel>;
  hidden: boolean;
  onSelect: (task: string) => void;
}

export function ModelsTaskNav({
  tasks,
  selectedTask,
  draft,
  adminModels,
  defaults,
  hidden,
  onSelect,
}: Readonly<ModelsTaskNavProps>) {
  const shared = sharedWith(tasks, draft, defaults);
  const summary = sharingSummary(tasks, draft, defaults);
  return (
    <div className={cn("border-b border-border p-2 md:border-r md:border-b-0", hidden && "max-md:hidden")}>
      {summary ? (
        <p id="task-nav-summary" className="px-3 pt-1.5 pb-2 text-xs text-muted-foreground">
          {summary}
        </p>
      ) : null}
      <div
        className="flex flex-col gap-1"
        role="tablist"
        aria-orientation="vertical"
        aria-label="Tipos de tarea"
        aria-describedby={summary ? "task-nav-summary" : undefined}
      >
        {tasks.map((task) => (
          <ModelsTaskTab
            key={task}
            task={task}
            selected={selectedTask === task}
            subtitle={taskSubtitle(task, draft, adminModels, defaults)}
            shared={shared[task]}
            onSelect={onSelect}
          />
        ))}
      </div>
    </div>
  );
}

function taskSubtitle(
  task: string,
  draft: Draft | null,
  adminModels: ChipModel[],
  defaults: Record<string, EnabledModel>,
): string {
  const assigned = draft?.[task]?.default;
  if (assigned?.provider && assigned.model_id) return chipLabel(assigned, adminModels);
  const fallback = Object.hasOwn(defaults, task) ? defaults[task] : undefined;
  if (fallback) return chipLabel(fallback, adminModels);
  return "Sin modelo";
}

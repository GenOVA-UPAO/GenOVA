import { cn } from "@/core/lib/cn";

import type { Draft } from "../lib/llm-config-draft";
import { chipLabel, type ChipModel } from "../lib/model-task-card.helpers";
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
  return (
    <div
      className={cn(
        "flex flex-row gap-1 overflow-x-auto border-b border-border/60 p-2 md:flex md:flex-col md:overflow-visible md:border-r md:border-b-0",
        hidden && "max-md:hidden",
      )}
      role="tablist"
      aria-label="Tipos de tarea"
    >
      {tasks.map((task) => (
        <ModelsTaskTab
          key={task}
          task={task}
          selected={selectedTask === task}
          subtitle={taskSubtitle(task, draft, adminModels, defaults)}
          onSelect={onSelect}
        />
      ))}
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

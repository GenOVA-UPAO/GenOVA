import { Button } from "@/core/components/ui/button";

import type { TaskDraft } from "../lib/llm-config-draft";
import { chipLabel, type ChipModel } from "../lib/model-task-card.helpers";
import type { EnabledModel } from "../lib/user-llm-settings.types";
import { ModelTaskCardChips } from "./model-task-card-chips";
import { UserOverrideSection } from "./user-override-section";

interface ModelsReadOnlyTaskProps {
  task: string;
  draft: TaskDraft | undefined;
  adminModels: ChipModel[];
  defaults: Record<string, EnabledModel>;
  chip: string;
  num: string;
  hasOwnLlmKey: boolean;
  saving: boolean;
  bounds: number[];
  onGoToCredentials: () => void;
}

export function ModelsReadOnlyTask({
  task,
  draft,
  adminModels,
  defaults,
  chip,
  num,
  hasOwnLlmKey,
  saving,
  bounds,
  onGoToCredentials,
}: Readonly<ModelsReadOnlyTaskProps>) {
  const subtitle = platformSubtitle(task, draft, adminModels, defaults);
  return (
    <div className="space-y-4">
      <div className="space-y-4 rounded-lg border border-border px-4 py-3.5">
        <div className="space-y-1">
          <p className="text-sm font-medium">Modelo principal</p>
          <p className="text-sm text-foreground">{subtitle}</p>
        </div>
        <ModelTaskCardChips
          fallbacks={draft?.fallbacks ?? []}
          models={adminModels}
          chip={chip}
          num={num}
        />
      </div>
      {hasOwnLlmKey ? (
        <UserOverrideSection
          task={task}
          chip={chip}
          num={num}
          userDisabled={saving}
          bounds={bounds}
        />
      ) : (
        <div className="flex flex-col gap-3 rounded-lg border border-dashed border-border px-4 py-3 sm:flex-row sm:items-center">
          <p className="min-w-0 flex-1 text-sm text-muted-foreground">
            Esta configuración la define el administrador. Con tu propia clave API puedes elegir
            otros modelos, que se pagan con tu cuenta.
          </p>
          <Button variant="outline" className="shrink-0 max-sm:h-11" onClick={onGoToCredentials}>
            Añadir clave
          </Button>
        </div>
      )}
    </div>
  );
}

function platformSubtitle(
  task: string,
  draft: TaskDraft | undefined,
  adminModels: ChipModel[],
  defaults: Record<string, EnabledModel>,
): string {
  const assigned = draft?.default;
  if (assigned?.provider && assigned.model_id) return chipLabel(assigned, adminModels);
  const fallback = Object.hasOwn(defaults, task) ? defaults[task] : undefined;
  if (fallback) return chipLabel(fallback, adminModels);
  return "Sin modelo";
}

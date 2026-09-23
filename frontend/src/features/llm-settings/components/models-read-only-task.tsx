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
}: Readonly<ModelsReadOnlyTaskProps>) {
  const subtitle = platformSubtitle(task, draft, adminModels, defaults);
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-sm font-medium">Modelo de la plataforma</p>
        <p className="text-sm text-foreground">{subtitle}</p>
        <div>
          <ModelTaskCardChips
            fallbacks={draft?.fallbacks ?? []}
            models={adminModels}
            chip={chip}
            num={num}
          />
        </div>
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
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground">
          Esta configuración la define el administrador. Añade tu clave API en Credenciales para
          elegir tus propios modelos.
        </p>
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

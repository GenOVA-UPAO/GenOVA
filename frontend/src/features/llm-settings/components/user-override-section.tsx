import { Input } from "@/core/components/ui/input";

import { useFavoriteActions } from "../hooks/use-favorite-actions";
import { useLlmSettings } from "../hooks/use-llm-settings";
import { useOwnKeyModels } from "../hooks/use-own-key-providers";
import { dedupeCatalogModels } from "../lib/dedupe-catalog";
import { taskMeta } from "../lib/task-meta";
import { modelsForTask } from "../lib/task-model-pool";
import { LlmModelSelect } from "./llm-model-select";
import { UserFallbackEditor } from "./user-fallback-editor";
import { UserModelSummary } from "./user-model-summary";
import { UserOverrideHeader } from "./user-override-header";

interface UserOverrideSectionProps {
  task: string;
  chip: string;
  num: string;
  userDisabled?: boolean;
  bounds?: number[];
}

export function UserOverrideSection({
  task,
  chip,
  num,
  userDisabled = false,
  bounds = [30, 300],
}: Readonly<UserOverrideSectionProps>) {
  const store = useLlmSettings();
  const userSettings = store.settings?.[task] ?? {};
  const favorites = useFavoriteActions();
  // Solo modelos de proveedores con clave propia: lo que elige se paga con ella.
  // Su catálogo completo (los favoritos salen primero); lo elegido se añade a favoritos.
  // Solo los aptos para la tarea: sin esto salían voz (Orpheus) o clasificadores
  // (Prompt Guard) entre los modelos de texto.
  const userModels = modelsForTask(
    useOwnKeyModels(dedupeCatalogModels([...store.catalogEnabled, ...store.catalogFull])),
    task,
  );
  const userFallbacks = userSettings.fallbacks ?? [];

  return (
    <div className="space-y-3 border-t border-border pt-5">
      <UserOverrideHeader
        isOverride={userSettings.override === true}
        disabled={userDisabled}
        onUsePlatform={() => {
          store.resetTipo(task);
        }}
      />
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <LlmModelSelect
            models={userModels}
            provider={userSettings.provider}
            modelId={userSettings.model_id}
            currentLabel={catalogLabel(store.catalogFull, userSettings.provider, userSettings.model_id)}
            disabled={userDisabled}
            ariaLabel={`Tu modelo para ${taskMeta(task).label}`}
            describedBy={`user-model-summary-${task}`}
            onChange={(ev) => {
              store.setModel(task, ev.provider, ev.modelId);
              favorites.keepPicked(ev.provider, ev.modelId);
            }}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Input
            type="number"
            min={bounds[0]}
            max={bounds[1]}
            value={userSettings.timeout_s ?? ""}
            disabled={userDisabled}
            aria-label={`Tiempo máximo de espera, de ${String(bounds[0])} a ${String(bounds[1])} segundos`}
            onChange={(event) => {
              const val = Number(event.target.value);
              if (!Number.isNaN(val)) store.setTipoTimeout(task, val);
            }}
            className="h-9 w-[4.5rem] px-1.5 text-center tabular-nums max-sm:h-11"
          />
          <span className="text-xs text-muted-foreground" aria-hidden="true">
            s
          </span>
        </div>
      </div>
      <UserModelSummary
        id={`user-model-summary-${task}`}
        models={userModels}
        provider={userSettings.provider}
        modelId={userSettings.model_id}
        disabled={userDisabled}
      />
      <p className="text-xs text-muted-foreground">
        Aparecen los modelos de los proveedores con tu clave, con tus favoritos primero.
      </p>
      <UserFallbackEditor
        fallbacks={userFallbacks}
        models={userModels}
        chip={chip}
        num={num}
        task={task}
        disabled={userDisabled}
      />
    </div>
  );
}

/** Nombre del modelo en el catálogo completo (el de la plataforma puede no estar activado). */
function catalogLabel(
  catalog: readonly { provider: string; model_id: string; label?: string }[],
  provider: string | undefined,
  modelId: string | undefined,
): string | undefined {
  return catalog.find((m) => m.provider === provider && m.model_id === modelId)?.label;
}

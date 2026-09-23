import { Button } from "@/core/components/ui/button";
import { Input } from "@/core/components/ui/input";

import { useLlmSettings } from "../hooks/use-llm-settings";
import type { ChipModel } from "../lib/model-task-card.helpers";
import { LlmModelSelect } from "./llm-model-select";
import { UserFallbackEditor } from "./user-fallback-editor";

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
  const userSettings = store.settings?.[task];
  const userModels: ChipModel[] = store.catalogEnabled;
  const userFallbacks = userSettings?.fallbacks ?? [];

  return (
    <div className="space-y-3 border-t border-border pt-5">
      <div className="flex items-center justify-between gap-2">
        <div>
          <p className="text-sm font-medium">Tu modelo</p>
          <p className="text-xs text-muted-foreground">Se usa en lugar del de la plataforma.</p>
        </div>
        <Button
          variant="ghost"
          size="xs"
          className="text-muted-foreground"
          disabled={userDisabled}
          onClick={() => {
            store.resetTipo(task);
          }}
        >
          Restaurar predeterminado
        </Button>
      </div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <LlmModelSelect
            models={userModels}
            provider={userSettings?.provider}
            modelId={userSettings?.model_id}
            disabled={userDisabled}
            ariaLabel={`Mi modelo ${task}`}
            onChange={(ev) => {
              store.setModel(task, ev.provider, ev.modelId);
            }}
          />
        </div>
        <div className="flex shrink-0 items-center gap-1">
          <Input
            type="number"
            min={bounds[0]}
            max={bounds[1]}
            value={userSettings?.timeout_s ?? ""}
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

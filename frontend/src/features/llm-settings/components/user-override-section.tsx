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
    <div className="space-y-2.5 border-t border-dashed border-border/50 pt-3">
      <div className="flex items-center justify-between">
        <p className="text-[9px] font-black tracking-[0.14em] text-muted-foreground/50 uppercase">
          Tu modelo
        </p>
        <button
          type="button"
          onClick={() => {
            store.resetTipo(task);
          }}
          disabled={userDisabled}
          className="text-[9px] font-semibold text-muted-foreground/40 transition-colors hover:text-destructive disabled:opacity-30"
        >
          Restaurar
        </button>
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
          <input
            type="number"
            min={bounds[0]}
            max={bounds[1]}
            value={userSettings?.timeout_s ?? ""}
            disabled={userDisabled}
            onChange={(event) => {
              const val = Number(event.target.value);
              if (!Number.isNaN(val)) store.setTipoTimeout(task, val);
            }}
            className="h-8 w-14 rounded-md border border-border/50 bg-background/60 text-center text-xs"
            title={`Timeout: ${String(bounds[0])}–${String(bounds[1])} s`}
          />
          <span className="text-[10px] text-muted-foreground/40">s</span>
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

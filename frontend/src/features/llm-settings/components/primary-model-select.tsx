import type { TaskDraft } from "../lib/llm-config-draft";
import { LlmModelSelect } from "./llm-model-select";

interface PrimarySelectProps {
  task: string;
  value: TaskDraft;
  models: { provider: string; model_id: string; label?: string }[];
  disabled: boolean;
  onChange: (next: TaskDraft) => void;
}

export function PrimaryModelSelect({
  task,
  value,
  models,
  disabled,
  onChange,
}: Readonly<PrimarySelectProps>) {
  return (
    <div className="block space-y-3">
      <div className="flex items-center gap-2">
        <span className="shrink-0 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-2 py-0.5 text-[10px] font-bold tracking-widest text-emerald-600 uppercase">
          Primario
        </span>
        <span className="text-xs font-bold text-foreground">Modelo principal</span>
      </div>
      <LlmModelSelect
        models={models}
        provider={value.default.provider}
        modelId={value.default.model_id}
        disabled={disabled}
        ariaLabel={`Modelo primario de ${task}`}
        onChange={(next) => {
          onChange({
            ...value,
            default: { ...value.default, provider: next.provider, model_id: next.modelId },
          });
        }}
      />
    </div>
  );
}

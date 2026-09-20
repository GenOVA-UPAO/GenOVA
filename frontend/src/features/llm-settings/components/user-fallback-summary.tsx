import { useLlmSettings } from "../hooks/use-llm-settings";
import {
  chipLabel,
  chipModality,
  type ChipModel,
  lookupModalitySymbol,
} from "../lib/model-task-card.helpers";

interface UserFallbackSummaryProps {
  fallbacks: { provider: string; model_id: string }[];
  models: ChipModel[];
  chip: string;
  num: string;
  task: string;
}

export function UserFallbackSummary({
  fallbacks,
  models,
  chip,
  num,
  task,
}: Readonly<UserFallbackSummaryProps>) {
  const store = useLlmSettings();
  if (fallbacks.length === 0) {
    return (
      <div className="text-[10px] text-muted-foreground italic">Sin cadena de respaldo personal</div>
    );
  }
  const visible = fallbacks.slice(0, 4);
  const overflow = Math.max(0, fallbacks.length - 4);
  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {visible.map((item, index) => (
        <span key={String(index)} className="inline-flex items-center gap-1">
          {index > 0 ? (
            <span className="text-[8px] font-black text-muted-foreground">→</span>
          ) : null}
          <span
            className={`inline-flex items-center gap-1 rounded-full border py-0.5 pr-1 pl-2 text-[10px] font-semibold ${chip}`}
          >
            <span className={`text-[9px] ${num}`}>
              {lookupModalitySymbol(chipModality(item, models))}
            </span>
            <span className="max-w-[70px] truncate">{chipLabel(item, models)}</span>
            <button
              type="button"
              aria-label={`Quitar ${chipLabel(item, models)}`}
              onClick={() => {
                store.removeFallback(task, index);
              }}
              className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-destructive/10 hover:text-destructive"
            >
              ×
            </button>
          </span>
        </span>
      ))}
      {overflow > 0 ? (
        <span className="inline-flex items-center rounded-full border border-border/50 bg-muted/60 px-2 py-0.5 text-[10px] text-muted-foreground">
          +{overflow}
        </span>
      ) : null}
    </div>
  );
}

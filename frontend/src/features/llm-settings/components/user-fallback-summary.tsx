import { Icon } from "@/core/components/icon";

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
      <p className="text-xs text-muted-foreground">Aún no tienes modelos de respaldo propios.</p>
    );
  }
  const visible = fallbacks.slice(0, 4);
  const overflow = Math.max(0, fallbacks.length - 4);
  return (
    <ol aria-label="Tus modelos de respaldo" className="flex flex-wrap items-center gap-1.5">
      {visible.map((item, index) => (
        <li
          key={String(index)}
          className={`inline-flex items-center gap-1 rounded-full border py-0.5 pr-0.5 pl-2.5 text-xs ${chip}`}
        >
          <span className={num} aria-hidden="true">
            {lookupModalitySymbol(chipModality(item, models))}
          </span>
          <span className="max-w-40 truncate" title={chipLabel(item, models)}>
            {index + 1}. {chipLabel(item, models)}
          </span>
          <button
            type="button"
            aria-label={`Quitar ${chipLabel(item, models)}`}
            onClick={() => {
              store.removeFallback(task, index);
            }}
            className="inline-flex size-6 items-center justify-center rounded-full transition-colors hover:bg-destructive/10 hover:text-destructive focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            <Icon name="x" size="text-xs" />
          </button>
        </li>
      ))}
      {overflow > 0 ? (
        <li className="inline-flex items-center rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          y {overflow} más
        </li>
      ) : null}
    </ol>
  );
}

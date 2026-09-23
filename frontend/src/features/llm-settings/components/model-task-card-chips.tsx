import { chipLabel, type ChipModel } from "../lib/model-task-card.helpers";

interface ModelTaskCardChipsProps {
  fallbacks: { provider: string; model_id: string }[];
  models: ChipModel[];
  /** Se conservan por compatibilidad con los llamadores; la lista ya no usa chips. */
  chip?: string;
  num?: string;
}

/**
 * Modelos de respaldo de solo lectura, en orden. Antes eran chips con un
 * símbolo de modalidad («Aa 1. …») sin título que dijera qué eran.
 */
export function ModelTaskCardChips({ fallbacks, models }: Readonly<ModelTaskCardChipsProps>) {
  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium">Modelos de respaldo</p>
      {fallbacks.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Ninguno: si el principal falla, la tarea se detiene.
        </p>
      ) : (
        <ol className="space-y-1 text-sm">
          {fallbacks.map((item, index) => (
            <li key={`${item.provider}:${item.model_id}:${String(index)}`} className="flex gap-2">
              <span className="w-4 shrink-0 text-right text-muted-foreground tabular-nums">
                {index + 1}.
              </span>
              <span className="min-w-0 truncate" title={chipLabel(item, models)}>
                {chipLabel(item, models)}
              </span>
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}

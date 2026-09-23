import {
  chipLabel,
  chipModality,
  type ChipModel,
  lookupModalitySymbol,
} from "../lib/model-task-card.helpers";

interface ModelTaskCardChipsProps {
  fallbacks: { provider: string; model_id: string }[];
  models: ChipModel[];
  chip: string;
  num: string;
}

export function ModelTaskCardChips({
  fallbacks,
  models,
  chip,
  num,
}: Readonly<ModelTaskCardChipsProps>) {
  const list = fallbacks;
  if (list.length === 0) {
    return (
      <p className="text-xs text-muted-foreground">Sin modelos de respaldo.</p>
    );
  }

  const visible = list.slice(0, 4);
  const overflow = Math.max(0, list.length - 4);

  return (
    <ol aria-label="Modelos de respaldo" className="flex flex-wrap items-center gap-1.5">
      {visible.map((item, index) => (
        <li
          key={`${item.provider}:${item.model_id}:${String(index)}`}
          className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs ${chip}`}
        >
          <span className={num} aria-hidden="true">
            {lookupModalitySymbol(chipModality(item, models))}
          </span>
          <span className="max-w-40 truncate" title={chipLabel(item, models)}>
            {index + 1}. {chipLabel(item, models)}
          </span>
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

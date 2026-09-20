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
      <div className="flex items-center gap-1.5 text-[10px] italic text-muted-foreground">
        <span className="h-1.5 w-1.5 rounded-full bg-muted-foreground/20" />
        Sin cadena de respaldo
      </div>
    );
  }

  const visible = list.slice(0, 4);
  const overflow = Math.max(0, list.length - 4);

  return (
    <div className="flex flex-wrap items-center gap-0.5">
      {visible.map((item, index) => (
        <span key={`${item.provider}:${item.model_id}:${String(index)}`} className="inline-flex items-center gap-1">
          {index > 0 ? <span className="text-[8px] font-black text-muted-foreground">→</span> : null}
          <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${chip}`}>
            <span className={`text-[9px] ${num}`}>{lookupModalitySymbol(chipModality(item, models))}</span>
            <span className="max-w-[80px] truncate">{chipLabel(item, models)}</span>
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

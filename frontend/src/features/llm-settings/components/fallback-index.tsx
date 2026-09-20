import { getModalitySymbol } from "./llm-task-row.helpers";

export function FallbackIndex({ index, modality }: Readonly<{ index: number; modality: string }>) {
  return (
    <div className="flex shrink-0 items-center gap-2">
      <span className="rounded-md border border-border bg-muted px-2 py-1 text-[10px] font-bold text-muted-foreground">
        #{index + 1}
      </span>
      {modality !== "text" ? (
        <span className="inline-flex items-center gap-0.5 rounded-full border border-purple-200 bg-purple-50 px-1.5 py-0.5 text-[9px] font-bold text-purple-600">
          {getModalitySymbol(modality)}
        </span>
      ) : null}
      {index > 0 ? (
        <span className="hidden text-[10px] font-black text-muted-foreground sm:inline">←</span>
      ) : null}
    </div>
  );
}

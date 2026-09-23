import { MODALITY_META } from "../lib/llm-catalog.utils";

/** Posición del respaldo en la cadena y, si no es de texto, su modalidad. */
export function FallbackIndex({ index, modality }: Readonly<{ index: number; modality: string }>) {
  const known = modality !== "text" && Object.hasOwn(MODALITY_META, modality);
  const modalityLabel = known ? MODALITY_META[modality].label : undefined;
  return (
    <div className="flex shrink-0 items-center gap-2 sm:h-9">
      <span className="w-5 text-sm text-muted-foreground tabular-nums">{index + 1}.</span>
      {modalityLabel ? (
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
          {modalityLabel}
        </span>
      ) : null}
    </div>
  );
}

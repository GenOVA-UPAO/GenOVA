export const MODALITY_SYMBOLS: Record<string, string> = {
  text: "Aa",
  multimodal: "◆",
  image: "◇",
  audio: "♪",
};

export type ChipModel = {
  provider: string;
  model_id: string;
  label?: string;
  modality?: string;
};

export function chipLabel(f: { provider: string; model_id: string }, models: ChipModel[]): string {
  return (
    models.find((m) => m.provider === f.provider && m.model_id === f.model_id)?.label ??
    f.model_id ??
    "—"
  );
}

export function chipModality(
  f: { provider: string; model_id: string },
  models: ChipModel[],
): string {
  return (
    models.find((m) => m.provider === f.provider && m.model_id === f.model_id)?.modality || "text"
  );
}

export function lookupModalitySymbol(mod: string): string {
  // biome-ignore lint/complexity/useLiteralKeys: TS4111 — Record index signature requires bracket access
  return MODALITY_SYMBOLS[mod] || MODALITY_SYMBOLS["text"];
}

import { firstNonBlank } from "@/core/lib/text";

import { modelDisplayName } from "./model-name";

export const MODALITY_SYMBOLS: Record<string, string> = {
  text: "Aa",
  multimodal: "◆",
  image: "◇",
  audio: "♪",
};

export interface ChipModel {
  provider: string;
  model_id: string;
  label?: string;
  modality?: string;
}

export function chipLabel(f: { provider: string; model_id: string }, models: ChipModel[]): string {
  const label = models.find((m) => m.provider === f.provider && m.model_id === f.model_id)?.label;
  return modelDisplayName(label, f.model_id);
}

export function chipModality(
  f: { provider: string; model_id: string },
  models: ChipModel[],
): string {
  const modality = models.find(
    (m) => m.provider === f.provider && m.model_id === f.model_id,
  )?.modality;
  return firstNonBlank(modality) ?? "text";
}

export function lookupModalitySymbol(mod: string): string {
  // biome-ignore lint/complexity/useLiteralKeys: TS4111 — Record index signature requires bracket access
  return MODALITY_SYMBOLS[mod] || MODALITY_SYMBOLS.text;
}

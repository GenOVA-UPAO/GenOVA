import { firstNonBlank } from "@/core/lib/text";

export const PROVIDER_LABELS: Record<string, string> = {
  groq: "Groq",
  openrouter: "OpenRouter",
  opencode: "OpenCode",
  huggingface: "HuggingFace",
  siliconflow: "SiliconFlow",
  runware: "Runware",
  falai: "fal.ai",
};

export interface ModalityMeta {
  label: string;
  color: string;
  bg: string;
}

export const MODALITY_META: Record<string, ModalityMeta> = {
  text: {
    label: "Texto",
    color: "text-blue-700 dark:text-blue-400",
    bg: "bg-blue-50 border-blue-200 dark:bg-blue-950/30 dark:border-blue-800",
  },
  multimodal: {
    label: "Multimodal",
    color: "text-purple-700 dark:text-purple-400",
    bg: "bg-purple-50 border-purple-200 dark:bg-purple-950/30 dark:border-purple-800",
  },
  image: {
    label: "Imagen",
    color: "text-pink-700 dark:text-pink-400",
    bg: "bg-pink-50 border-pink-200 dark:bg-pink-950/30 dark:border-pink-800",
  },
  video: {
    label: "Video",
    color: "text-orange-700 dark:text-orange-400",
    bg: "bg-orange-50 border-orange-200 dark:bg-orange-950/30 dark:border-orange-800",
  },
  audio: {
    label: "Audio",
    color: "text-amber-800 dark:text-amber-400",
    bg: "bg-amber-50 border-amber-200 dark:bg-amber-950/30 dark:border-amber-800",
  },
  embedding: {
    label: "Embedding",
    color: "text-emerald-700 dark:text-emerald-400",
    bg: "bg-emerald-50 border-emerald-200 dark:bg-emerald-950/30 dark:border-emerald-800",
  },
};

export function groupByProvider<T extends { provider?: string }>(
  entries: T[],
): Record<string, T[]> {
  if (!Array.isArray(entries)) return {};
  const groups: Record<string, T[]> = {};
  for (const e of entries) {
    const p = firstNonBlank(e.provider) ?? "unknown";
    if (Object.hasOwn(groups, p)) groups[p].push(e);
    else groups[p] = [e];
  }
  return groups;
}

export function formatContextLength(n: number | undefined): string | null {
  if (typeof n !== "number" || n <= 0) return null;
  if (n >= 1_000_000) {
    const m = n / 1_000_000;
    return `${Number.isInteger(m) ? String(m) : m.toFixed(1)}M ctx`;
  }
  if (n >= 1000) return `${String(Math.round(n / 1000))}k ctx`;
  return `${String(n)} ctx`;
}

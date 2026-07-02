import { addEmpty, moveIn, removeAt, setAt } from "./fallbackArray";

export interface Entry {
  provider: string;
  model_id: string;
  extra?: Record<string, unknown>;
}

export interface TaskDraft {
  default: Entry;
  fallbacks: Entry[];
}

export type Draft = Record<string, TaskDraft>;

export interface EffectiveConfig {
  defaults?: Record<string, Entry>;
  fallbacks?: Record<string, Entry[]>;
}

const emptyEntry = (): Entry => ({ provider: "", model_id: "", extra: {} });

export function moveFallback(list: Entry[], i: number, dir: number): Entry[] {
  return moveIn(list, i, dir);
}

export function addFallback(list: Entry[]): Entry[] {
  return addEmpty(list, emptyEntry);
}

export function removeFallback(list: Entry[], i: number): Entry[] {
  return removeAt(list, i);
}

export function setFallback(list: Entry[], i: number, provider: string, model_id: string): Entry[] {
  return setAt(list, i, { provider, model_id });
}

export function toDraft(cfg: EffectiveConfig | null | undefined, tasks: string[]): Draft {
  const defaults = cfg?.defaults ?? {};
  const fallbacks = cfg?.fallbacks ?? {};
  const draft: Draft = {};
  for (const t of tasks) {
    draft[t] = {
      default: defaults[t] ?? emptyEntry(),
      fallbacks: fallbacks[t] ?? [],
    };
  }
  return draft;
}

export function toPayload(draft: Draft | null | undefined, tasks: string[]): EffectiveConfig {
  const defaults: Record<string, Entry> = {};
  const fallbacks: Record<string, Entry[]> = {};
  for (const t of tasks) {
    const d = draft?.[t]?.default;
    if (d?.provider && d?.model_id) {
      defaults[t] = {
        provider: d.provider,
        model_id: d.model_id,
        extra: d.extra ?? {},
      };
    }
    const fb = (draft?.[t]?.fallbacks ?? [])
      .filter((f) => f.provider && f.model_id)
      .map((f) => ({
        provider: f.provider,
        model_id: f.model_id,
        extra: f.extra ?? {},
      }));
    if (fb.length) fallbacks[t] = fb;
  }
  return { defaults, fallbacks };
}

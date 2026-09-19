import { addEmpty, moveIn, removeAt, setAt } from "./fallback-array";

export interface Entry {
  provider: string;
  model_id: string;
  extra?: Record<string, unknown>;
}

export interface TaskDraft {
  default: Entry;
  fallbacks: Entry[];
  /** Solo aplica a tareas de media (imagen/video); undefined = default de la tarea. */
  generationEnabled?: boolean;
}

export type Draft = Record<string, TaskDraft>;

export interface EffectiveConfig {
  defaults?: Record<string, Entry>;
  fallbacks?: Record<string, Entry[]>;
  generation_enabled?: Record<string, boolean>;
}

const MEDIA_TASKS = new Set(["imagen", "video"]);

export function isMediaTask(task: string): boolean {
  return MEDIA_TASKS.has(task);
}

/** Video off by default (needs an explicit opt-in); imagen on. */
export function defaultGenerationEnabled(task: string): boolean {
  return task !== "video";
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
  const generationEnabled = cfg?.generation_enabled ?? {};
  const draft: Draft = {};
  for (const t of tasks) {
    draft[t] = {
      default: defaults[t] ?? emptyEntry(),
      fallbacks: fallbacks[t] ?? [],
      ...(isMediaTask(t) && t in generationEnabled
        ? { generationEnabled: generationEnabled[t] }
        : {}),
    };
  }
  return draft;
}

export function toPayload(draft: Draft | null | undefined, tasks: string[]): EffectiveConfig {
  const defaults: Record<string, Entry> = {};
  const fallbacks: Record<string, Entry[]> = {};
  const generationEnabled: Record<string, boolean> = {};
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
    if (isMediaTask(t) && typeof draft?.[t]?.generationEnabled === "boolean") {
      generationEnabled[t] = draft[t].generationEnabled;
    }
  }
  return {
    defaults,
    fallbacks,
    ...(Object.keys(generationEnabled).length ? { generation_enabled: generationEnabled } : {}),
  };
}

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

function taskDraftFrom(cfg: EffectiveConfig, t: string): TaskDraft {
  const generationEnabled = cfg.generation_enabled ?? {};
  const base: TaskDraft = {
    default: cfg.defaults?.[t] ?? emptyEntry(),
    fallbacks: cfg.fallbacks?.[t] ?? [],
  };
  return isMediaTask(t) && t in generationEnabled
    ? { ...base, generationEnabled: generationEnabled[t] }
    : base;
}

export function toDraft(cfg: EffectiveConfig | null | undefined, tasks: string[]): Draft {
  const draft: Draft = {};
  for (const t of tasks) draft[t] = taskDraftFrom(cfg ?? {}, t);
  return draft;
}

const isComplete = (e: Entry): boolean => Boolean(e.provider && e.model_id);

const payloadEntry = (e: Entry): Entry => ({
  provider: e.provider,
  model_id: e.model_id,
  extra: e.extra ?? {},
});

export function toPayload(draft: Draft | null | undefined, tasks: string[]): EffectiveConfig {
  const defaults: Record<string, Entry> = {};
  const fallbacks: Record<string, Entry[]> = {};
  const generationEnabled: Record<string, boolean> = {};
  for (const t of tasks) {
    const task = draft?.[t];
    if (!task) continue;
    if (isComplete(task.default)) defaults[t] = payloadEntry(task.default);
    const fb = task.fallbacks.filter(isComplete).map(payloadEntry);
    if (fb.length) fallbacks[t] = fb;
    if (isMediaTask(t) && typeof task.generationEnabled === "boolean") {
      generationEnabled[t] = task.generationEnabled;
    }
  }
  return {
    defaults,
    fallbacks,
    ...(Object.keys(generationEnabled).length ? { generation_enabled: generationEnabled } : {}),
  };
}

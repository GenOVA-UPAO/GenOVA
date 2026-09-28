import { type Draft, type Entry, isMediaTask, type TaskDraft } from "./llm-config-draft";

/**
 * Copiar el modelo principal de una tarea (y, si se quiere, sus respaldos) a
 * otras tareas de texto. Imagen y video no entran: necesitan modelos propios.
 *
 * Lógica pura: se prueba en bulk-apply.spec.ts.
 */

export interface ApplyPreview {
  task: string;
  from: Entry;
  to: Entry;
  /** Respaldos antes y después (solo los completos). */
  fallbacksFrom: Entry[];
  fallbacksTo: Entry[];
  /** Si la tarea ya quedaba igual: se muestra, pero no cuenta como cambio. */
  unchanged: boolean;
}

const complete = (entry: Entry) => Boolean(entry.provider && entry.model_id);
const same = (a: Entry, b: Entry) => a.provider === b.provider && a.model_id === b.model_id;
const copy = (entry: Entry): Entry => ({
  provider: entry.provider,
  model_id: entry.model_id,
  extra: entry.extra ?? {},
});

/** Tareas a las que se puede copiar el modelo de `source`. */
export function applyTargets(tasks: readonly string[], source: string): string[] {
  return tasks.filter((task) => task !== source && !isMediaTask(task));
}

function nextChain(
  source: TaskDraft,
  target: TaskDraft | undefined,
  withFallbacks: boolean,
): TaskDraft {
  const primary = copy(source.default);
  const kept = (target?.fallbacks ?? []).filter(complete);
  // Sin copiar respaldos, el nuevo principal no puede seguir siendo respaldo: sería un repetido.
  const fallbacks = withFallbacks
    ? source.fallbacks.filter(complete).map(copy)
    : kept.filter((entry) => !same(entry, primary));
  return { ...(target ?? { fallbacks: [] }), default: primary, fallbacks };
}

function sameChain(a: Entry[], b: Entry[]): boolean {
  return a.length === b.length && a.every((entry, i) => same(entry, b[i]));
}

export function previewApply(
  draft: Draft,
  source: string,
  targets: readonly string[],
  withFallbacks: boolean,
): ApplyPreview[] {
  const origin = draft[source] as TaskDraft | undefined;
  if (!origin || !complete(origin.default)) return [];
  return targets.map((task) => {
    const before = draft[task] as TaskDraft | undefined;
    const after = nextChain(origin, before, withFallbacks);
    const fallbacksFrom = (before?.fallbacks ?? []).filter(complete);
    const from = before?.default ?? { provider: "", model_id: "" };
    return {
      task,
      from,
      to: after.default,
      fallbacksFrom,
      fallbacksTo: after.fallbacks,
      unchanged: same(from, after.default) && sameChain(fallbacksFrom, after.fallbacks),
    };
  });
}

export function applyToTasks(
  draft: Draft,
  source: string,
  targets: readonly string[],
  withFallbacks: boolean,
): Draft {
  const origin = draft[source] as TaskDraft | undefined;
  if (!origin || !complete(origin.default)) return draft;
  const next: Draft = { ...draft };
  for (const task of targets) next[task] = nextChain(origin, draft[task], withFallbacks);
  return next;
}

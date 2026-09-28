import type { Draft } from "./llm-config-draft";
import { isMediaTask } from "./llm-config-draft";
import { taskMeta } from "./task-meta";
import type { EnabledModel } from "./user-llm-settings.types";

/**
 * Qué tareas de texto comparten modelo principal, para verlo de un vistazo en
 * la lista de tareas. Imagen y video no entran: usan modelos de otro tipo.
 */

const keyOf = (entry: EnabledModel | undefined) =>
  entry?.provider && entry.model_id ? `${entry.provider}::${entry.model_id}` : null;

function primaryKey(
  task: string,
  draft: Draft | null | undefined,
  defaults: Record<string, EnabledModel>,
): string | null {
  const assigned = keyOf(draft?.[task]?.default);
  if (assigned) return assigned;
  return keyOf(Object.hasOwn(defaults, task) ? defaults[task] : undefined);
}

/** Por tarea de texto, con qué otras tareas comparte el modelo principal (etiquetas). */
export function sharedWith(
  tasks: readonly string[],
  draft: Draft | null | undefined,
  defaults: Record<string, EnabledModel>,
): Record<string, string[]> {
  const text = tasks.filter((task) => !isMediaTask(task));
  const keys = Object.fromEntries(text.map((task) => [task, primaryKey(task, draft, defaults)]));
  const out: Record<string, string[]> = {};
  for (const task of text) {
    const key = keys[task];
    out[task] = key
      ? text
          .filter((other) => other !== task && keys[other] === key)
          .map((other) => taskMeta(other).label)
      : [];
  }
  return out;
}

/** Resumen para la cabecera de la lista: «Las 4 usan el mismo modelo» o «3 modelos distintos». */
export function sharingSummary(
  tasks: readonly string[],
  draft: Draft | null | undefined,
  defaults: Record<string, EnabledModel>,
): string | null {
  const text = tasks.filter((task) => !isMediaTask(task));
  if (text.length < 2) return null;
  const keys = text.map((task) => primaryKey(task, draft, defaults)).filter((key) => key !== null);
  const distinct = new Set(keys).size;
  if (distinct === 0) return null;
  if (distinct === 1 && keys.length === text.length) {
    return `Las ${String(text.length)} tareas de texto usan el mismo modelo`;
  }
  return distinct === 1
    ? "Las tareas de texto usan 1 modelo"
    : `Las tareas de texto usan ${String(distinct)} modelos distintos`;
}

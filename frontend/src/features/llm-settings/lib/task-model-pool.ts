/**
 * Restringe el catálogo a los modelos que el usuario activó en «Gestionar
 * modelos». Es lo que da sentido a ese interruptor: filtra lo que se puede
 * elegir como primario o como fallback de cada tarea.
 *
 * Con la lista vacía (instalación nueva, o nadie ha activado nada todavía) se
 * devuelve el catálogo entero: dejar los selects en blanco sería peor que no
 * filtrar.
 */
export function enabledOnly<T extends ModelRef>(models: T[], enabled: readonly ModelRef[]): T[] {
  if (enabled.length === 0) return models;
  const keys = new Set(enabled.map(modelKey));
  return models.filter((m) => keys.has(modelKey(m)));
}

/** Pool = enabled catalog ∩ apt for task (multimodal may appear in several). */
export function modelsForTask<T extends { aptitudes?: string[]; category?: string }>(
  models: T[],
  task: string,
): T[] {
  return models.filter((m) => {
    const apt = m.aptitudes;
    if (Array.isArray(apt) && apt.length > 0) return apt.includes(task);
    // Fallback: category match when aptitudes absent (older catalog rows).
    return (m.category || "") === task;
  });
}

export interface ModelRef {
  provider: string;
  model_id: string;
  label?: string;
}

function modelKey(m: ModelRef): string {
  return `${m.provider}::${m.model_id}`;
}

/**
 * Ensures currently assigned models stay in the select pool even when the
 * catalog category/aptitudes filter would exclude them (e.g. DeepSeek tagged
 * as codigo but seeded as texto primary).
 */
export function includeSelectedInPool<T extends ModelRef>(
  pool: T[],
  all: T[],
  selected: (ModelRef | null | undefined)[],
): T[] {
  const seen = new Set(pool.map(modelKey));
  const out = [...pool];
  for (const sel of selected) {
    if (!sel?.provider || !sel?.model_id) continue;
    const key = modelKey(sel);
    if (seen.has(key)) continue;
    const found = all.find((m) => m.provider === sel.provider && m.model_id === sel.model_id);
    const stub = { ...sel, label: sel.label || sel.model_id } as T;
    out.push(found ?? stub);
    seen.add(key);
  }
  return out;
}

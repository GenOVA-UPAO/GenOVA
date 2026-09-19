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

/**
 * Tareas que exigen una capacidad que un modelo de texto NO puede suplir: si el
 * modelo no genera imagen o vídeo, ofrecerlo sería ofrecer algo que fallará.
 * El resto (texto, código/HTML, orquestador, razonamiento) son variantes de
 * generar texto, así que ahí la aptitud ORIENTA pero no excluye.
 */
const APTITUD_OBLIGATORIA = new Set(["imagen", "video"]);

function tieneAptitud(m: { aptitudes?: string[]; category?: string }, task: string): boolean {
  const apt = m.aptitudes;
  if (Array.isArray(apt) && apt.length > 0) return apt.includes(task);
  // Catálogos antiguos sin `aptitudes`: cae a la categoría.
  return (m.category || "") === task;
}

/**
 * Modelos ofrecibles para una tarea.
 *
 * Para imagen y vídeo se filtra de verdad. Para las tareas de texto NO se
 * excluye a nadie: solo 20 de los ~430 modelos del catálogo declaran aptitud
 * `codigo`, y generar HTML no requiere ninguna capacidad especial, así que
 * filtrar por ella dejaba el selector de Código con un único modelo. Los que sí
 * declaran la aptitud van primero, para que la recomendación siga visible.
 */
export function modelsForTask<T extends { aptitudes?: string[]; category?: string }>(
  models: T[],
  task: string,
): T[] {
  if (APTITUD_OBLIGATORIA.has(task)) {
    return models.filter((m) => tieneAptitud(m, task));
  }
  const aptos: T[] = [];
  const resto: T[] = [];
  for (const m of models) (tieneAptitud(m, task) ? aptos : resto).push(m);
  return [...aptos, ...resto];
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

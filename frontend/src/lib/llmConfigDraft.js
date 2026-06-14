/**
 * Lógica pura del panel admin de modelos LLM (sin React/DOM/red).
 * Reusada por los componentes settings y cubierta por unit tests.
 *
 * Entry = { provider, model_id, extra? }
 * Draft (por tarea) = { default: Entry, fallbacks: Entry[] }
 */

const emptyEntry = () => ({ provider: '', model_id: '', extra: {} })

/** Sube (-1) o baja (+1) el fallback i; no-op si queda fuera de rango. */
export function moveFallback(list, i, dir) {
  const j = i + dir
  if (j < 0 || j >= list.length) return list
  const next = [...list]
  ;[next[i], next[j]] = [next[j], next[i]]
  return next
}

/** Agrega un fallback vacío al final. */
export function addFallback(list) {
  return [...list, emptyEntry()]
}

/** Quita el fallback i. */
export function removeFallback(list, i) {
  return list.filter((_, j) => j !== i)
}

/** Reemplaza provider/model_id del fallback i (conserva extra). */
export function setFallback(list, i, provider, model_id) {
  return list.map((f, j) => (j === i ? { ...f, provider, model_id } : f))
}

/** Config efectiva del servidor → draft editable por tarea. */
export function toDraft(cfg, tasks) {
  const defaults = cfg?.defaults ?? {}
  const fallbacks = cfg?.fallbacks ?? {}
  const draft = {}
  for (const t of tasks) {
    draft[t] = {
      default: defaults[t] ?? emptyEntry(),
      fallbacks: fallbacks[t] ?? [],
    }
  }
  return draft
}

/** Draft → payload para el PUT; descarta entries sin provider+model_id. */
export function toPayload(draft, tasks) {
  const defaults = {}
  const fallbacks = {}
  for (const t of tasks) {
    const d = draft?.[t]?.default
    if (d?.provider && d?.model_id) {
      defaults[t] = { provider: d.provider, model_id: d.model_id, extra: d.extra ?? {} }
    }
    const fb = (draft?.[t]?.fallbacks ?? [])
      .filter((f) => f.provider && f.model_id)
      .map((f) => ({ provider: f.provider, model_id: f.model_id, extra: f.extra ?? {} }))
    if (fb.length) fallbacks[t] = fb
  }
  return { defaults, fallbacks }
}

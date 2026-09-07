/**
 * Lógica pura de la tarjeta de guardrails de generación (pestaña Plataforma).
 *
 * Contrato con el backend (endpoints de admin):
 *   GET/PUT /api/admin/guardrails con
 *   - guardrail_topic_enabled / guardrail_moderation_enabled: "1" | "0"
 *   - guardrail_topic_area: texto libre; VACÍO = cualquier tema
 *   - guardrail_moderation_terms: lista de términos separados por saltos de línea
 *   - guardrail_moderation_model: "" | "<provider>/<model_id>"
 *
 * Dos niveles de moderación: si hay modelo configurado se usa el modelo; si no,
 * la lista de términos (el suelo que siempre existe).
 */

export interface GuardrailsConfig {
  topicEnabled: boolean;
  topicArea: string;
  moderationEnabled: boolean;
  terms: string[];
  moderationModel: string;
}

export interface GuardrailsDraft {
  topicEnabled: boolean;
  topicArea: string;
  moderationEnabled: boolean;
  /** Texto del textarea: un término por línea (el admin lo edita tal cual). */
  termsText: string;
  model: { provider: string; modelId: string };
}

/**
 * Textarea → lista normalizada de términos. Aquí es donde se cuelan los bugs:
 * - separa por saltos de línea (y tolera \r\n);
 * - recorta espacios de cada término;
 * - descarta líneas vacías;
 * - elimina duplicados sin distinguir mayúsculas ("Nudo" y "nudo" son el mismo
 *   filtro), conservando el primer escrito.
 */
export function normalizeTerms(raw: string): string[] {
  const seen = new Set<string>();
  const terms: string[] = [];
  for (const line of (raw || "").split(/\r\n|\r|\n/)) {
    const term = line.trim();
    if (!term) continue;
    const key = term.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    terms.push(term);
  }
  return terms;
}

/** Lista → textarea (una línea por término). */
export function serializeTerms(terms: string[]): string {
  return (terms || []).join("\n");
}

/** El backend puede mandar los términos como string con \n o como array. */
export function toTermsList(raw: unknown): string[] {
  if (Array.isArray(raw)) return normalizeTerms(raw.map(String).join("\n"));
  if (typeof raw === "string") return normalizeTerms(raw);
  return [];
}

/** "" | "<provider>/<model_id>" → {provider, modelId} | null. */
export function parseModerationModel(value: string): { provider: string; modelId: string } | null {
  const raw = (value || "").trim();
  if (!raw) return null;
  const slash = raw.indexOf("/");
  if (slash <= 0) return null;
  const provider = raw.slice(0, slash);
  const modelId = raw.slice(slash + 1);
  if (!provider || !modelId) return null;
  return { provider, modelId };
}

/** {provider, modelId} → "" | "<provider>/<model_id>" (el formato del contrato). */
export function formatModerationModel(
  provider: string | undefined,
  modelId: string | undefined,
): string {
  const p = (provider || "").trim();
  const m = (modelId || "").trim();
  if (!p || !m) return "";
  return `${p}/${m}`;
}

function asText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function parseGuardrailsConfig(raw: unknown): GuardrailsConfig | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  return {
    topicEnabled: asText(r["guardrail_topic_enabled"] ?? "0") === "1",
    topicArea: asText(r["guardrail_topic_area"]),
    moderationEnabled: asText(r["guardrail_moderation_enabled"] ?? "0") === "1",
    terms: toTermsList(r["guardrail_moderation_terms"]),
    moderationModel: asText(r["guardrail_moderation_model"]),
  };
}

/** Borrador → payload exacto del contrato (PUT). */
export function toGuardrailsPayload(draft: GuardrailsDraft): Record<string, string> {
  return {
    guardrail_topic_enabled: draft.topicEnabled ? "1" : "0",
    guardrail_topic_area: draft.topicArea.trim(),
    guardrail_moderation_enabled: draft.moderationEnabled ? "1" : "0",
    guardrail_moderation_terms: serializeTerms(normalizeTerms(draft.termsText)),
    guardrail_moderation_model: formatModerationModel(draft.model.provider, draft.model.modelId),
  };
}

/**
 * ¿Hay cambios sin guardar? El área temática se compara recortada (un espacio
 * final no es un cambio real) y los términos por su lista normalizada.
 */
export function guardrailsHasChanges(
  config: GuardrailsConfig | null | undefined,
  draft: GuardrailsDraft,
): boolean {
  if (!config) return false;
  return (
    config.topicEnabled !== draft.topicEnabled ||
    config.topicArea.trim() !== draft.topicArea.trim() ||
    config.moderationEnabled !== draft.moderationEnabled ||
    JSON.stringify(config.terms) !== JSON.stringify(normalizeTerms(draft.termsText)) ||
    config.moderationModel !== formatModerationModel(draft.model?.provider, draft.model?.modelId)
  );
}

/** ¿Qué le va a pasar a la app con el borrador actual? Para avisar ANTES de guardar. */
export function topicImpact(draft: GuardrailsDraft): { restricted: boolean; area: string } {
  const active = draft.topicEnabled && draft.topicArea.trim().length > 0;
  return { restricted: active, area: active ? draft.topicArea.trim() : "" };
}

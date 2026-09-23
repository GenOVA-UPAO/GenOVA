import type { LlmSettingsStore } from "../hooks/llm-settings-store.types";
import { useLlmSettings } from "../hooks/use-llm-settings";
import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";
import { chipLabel } from "../lib/model-task-card.helpers";

interface LlmSettingsPlatformTaskProps {
  tipo: string;
  label: string;
}

/**
 * Tarea en solo lectura (sin clave propia): el modelo que de verdad usa la
 * plataforma, como texto. Antes era un select deshabilitado con el modelo
 * semilla del backend, que no coincidía con el configurado por el admin.
 */
export function LlmSettingsPlatformTask({ tipo, label }: Readonly<LlmSettingsPlatformTaskProps>) {
  const summary = platformSummary(useLlmSettings(), tipo);
  return (
    <li className="flex items-start justify-between gap-3 py-3.5 first:pt-0 last:pb-0">
      <span className="text-sm font-medium">{label}</span>
      <span className="min-w-0 text-right text-sm">
        <span className="block truncate">{summary.name}</span>
        <span className="block text-xs text-muted-foreground">{summary.detail}</span>
      </span>
    </li>
  );
}

function platformSummary(store: LlmSettingsStore, tipo: string): { name: string; detail: string } {
  const entry = platformEntry(store, tipo);
  if (!entry) return { name: "Sin modelo", detail: "" };
  const models = [...store.catalogEnabled, ...store.catalogFull];
  const provider = PROVIDER_LABELS[entry.provider] ?? entry.provider;
  return {
    name: chipLabel(entry, models),
    detail: `${provider}${fallbackText(platformFallbackCount(store, tipo))}`,
  };
}

function platformEntry(
  store: LlmSettingsStore,
  tipo: string,
): { provider: string; model_id: string } | null {
  const platform = store.platform?.defaults ?? {};
  const entry = Object.hasOwn(platform, tipo) ? platform[tipo] : store.settings?.[tipo];
  if (!entry?.provider || !entry.model_id) return null;
  return { provider: entry.provider, model_id: entry.model_id };
}

function platformFallbackCount(store: LlmSettingsStore, tipo: string): number {
  return store.platform?.fallbacks?.[tipo]?.length ?? 0;
}

function fallbackText(count: number): string {
  if (count === 0) return "";
  return ` · ${String(count)} ${count === 1 ? "respaldo" : "respaldos"}`;
}

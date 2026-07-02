import { InjectionToken, type OutputRef, type Type } from "@angular/core";

/**
 * Contrato mínimo del modal de ajustes LLM. La feature llm-settings provee la
 * implementación; app.config la registra (composición en app); ova-workspace
 * la consume vía token sin importar la feature.
 */
export interface LlmSettingsModalContract {
  readonly onOpenChange: OutputRef<boolean>;
}

/** Loader perezoso del componente modal — mantiene llm-settings fuera del bundle inicial. */
export const LLM_SETTINGS_MODAL = new InjectionToken<() => Promise<Type<LlmSettingsModalContract>>>(
  "LLM_SETTINGS_MODAL",
);

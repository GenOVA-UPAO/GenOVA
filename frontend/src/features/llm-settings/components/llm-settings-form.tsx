import { Icon } from "@/core/components/icon";

import { useLlmSettings } from "../hooks/use-llm-settings";
import { TASK_LABELS } from "../lib/llm-settings-labels";
import { LlmSettingsFormTask } from "./llm-settings-form-task";

export function LlmSettingsForm({ readOnly = false }: Readonly<{ readOnly?: boolean }>) {
  const store = useLlmSettings();
  const locked = store.saving || readOnly;
  const taskKeys = Object.keys(TASK_LABELS);
  const noCatalog = Object.keys(store.catalog).every((provider) => {
    const models = store.catalog[provider];
    return !Array.isArray(models) || models.length === 0;
  });

  if (store.loading || !store.settings) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-muted border-t-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {readOnly ? (
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2.5">
          <Icon name="lock" size="text-xs" className="text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            Configurado por el administrador.
            <span className="font-semibold text-foreground"> Añade una API key</span> en Mi Perfil →
            API Keys para personalizar.
          </p>
        </div>
      ) : null}
      {taskKeys.map((tipo) => (
        <LlmSettingsFormTask key={tipo} tipo={tipo} locked={locked} />
      ))}
      {noCatalog && !readOnly ? (
        <div className="rounded-lg border border-border bg-muted/30 px-3 py-2.5 text-xs text-muted-foreground">
          No se pudo cargar el catálogo de modelos. Se usan los modelos por defecto del sistema.{" "}
          <button
            type="button"
            onClick={() => {
              void store.retryRefresh();
            }}
            disabled={store.refreshingCatalog}
            className="font-semibold text-primary hover:underline disabled:opacity-50"
          >
            {store.refreshingCatalog ? "Actualizando…" : "Reintentar"}
          </button>
        </div>
      ) : null}
      <p className="px-0.5 text-[10px] text-muted-foreground/50">
        Timeout: {store.bounds[0]}–{store.bounds[1]} s · aplica a todos tus OVAs
      </p>
    </div>
  );
}

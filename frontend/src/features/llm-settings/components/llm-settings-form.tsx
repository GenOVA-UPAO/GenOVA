import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";

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

  if (store.error) {
    return (
      <div role="alert" className="flex flex-col items-center gap-3 py-8 text-center">
        <p className="text-sm text-muted-foreground">{store.error}</p>
        <Button variant="outline" onClick={store.refetch}>
          Reintentar
        </Button>
      </div>
    );
  }

  if (store.loading || !store.settings) {
    return (
      <div className="space-y-4 py-2" role="status" aria-busy="true" aria-label="Cargando ajustes">
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
        <Skeleton className="h-14 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {readOnly ? (
        <p className="flex items-start gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground">
          <Icon name="lock" size="text-sm" className="mt-0.5 shrink-0" />
          Los elige el administrador. Para personalizarlos, añade tu clave API en Modelos de IA,
          pestaña Credenciales.
        </p>
      ) : null}
      <ul className="divide-y divide-border">
        {taskKeys.map((tipo) => (
          <LlmSettingsFormTask key={tipo} tipo={tipo} locked={locked} />
        ))}
      </ul>
      {noCatalog && !readOnly ? (
        <div className="flex flex-col gap-2 rounded-lg bg-muted/60 px-3 py-2.5 text-sm text-muted-foreground sm:flex-row sm:items-center">
          <p className="flex-1">
            No se pudo cargar el catálogo de modelos. Mientras tanto se usan los del sistema.
          </p>
          <Button
            variant="outline"
            size="sm"
            loading={store.refreshingCatalog}
            onClick={() => {
              void store.retryRefresh();
            }}
          >
            Reintentar
          </Button>
        </div>
      ) : null}
      <p className="text-xs text-muted-foreground">
        El tiempo máximo de espera va de {store.bounds[0]} a {store.bounds[1]} segundos y se aplica
        a todos tus OVAs.
      </p>
    </div>
  );
}

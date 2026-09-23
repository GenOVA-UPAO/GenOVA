import { Button } from "@/core/components/ui/button";

import type { ResourceVM } from "../../lib/ova-job-view-model";

export function TotalFailurePanel({
  viewModel,
  onRetryAll,
}: Readonly<{ viewModel: ResourceVM[]; onRetryAll: () => void }>) {
  const errorId = viewModel.find((resource) => resource.error_id)?.error_id;
  return (
    <div className="space-y-3">
      <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4">
        <p className="font-semibold text-destructive">No se pudo generar el OVA</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Ningún recurso se completó, así que no se guardó el OVA. Puedes reintentar la generación
          con la misma configuración.
          {errorId && (
            <span className="mt-1 block text-xs">
              Error ID: <span className="font-mono">{errorId}</span>
            </span>
          )}
        </p>
      </div>
      <Button
        onClick={onRetryAll}
      >
        Reintentar generación
      </Button>
    </div>
  );
}

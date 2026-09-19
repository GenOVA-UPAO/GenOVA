import { Button } from "@/core/components/ui/button";

import type { ResourceVM } from "../../lib/ova-job-view-model";

export function TotalFailurePanel({
  viewModel,
  onRetryAll,
}: Readonly<{ viewModel: ResourceVM[]; onRetryAll: () => void }>) {
  const errorId = viewModel.find((resource) => resource.error_id)?.error_id;
  return (
    <div className="space-y-3">
      <div className="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p className="font-semibold text-destructive">No se pudo generar el OVA</p>
        <p className="mt-1 text-sm text-muted-foreground">
          Lo sentimos, hubo un error generando los recursos. Ningún recurso se completó, por lo que
          no se guardó ningún OVA.
          {errorId && (
            <span className="mt-1 block text-xs">
              Error ID: <span className="font-mono">{errorId}</span>
            </span>
          )}
        </p>
      </div>
      <Button
        variant="destructive"
        onClick={onRetryAll}
      >
        Reintentar generación
      </Button>
    </div>
  );
}

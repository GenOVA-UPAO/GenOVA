import { Button } from "@/core/components/ui/button";

import type { ResourceVM } from "../../lib/ova-job-view-model";

/** Fallo total: qué pasó, qué se conserva y la única acción que lo arregla. */
export function TotalFailurePanel({
  viewModel,
  onRetryAll,
}: Readonly<{ viewModel: ResourceVM[]; onRetryAll: () => void }>) {
  const errorId = viewModel.find((resource) => resource.error_id)?.error_id;
  return (
    <section
      aria-labelledby="total-failure-title"
      className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4 sm:p-5"
    >
      <div>
        <h2 id="total-failure-title" className="font-semibold text-destructive">
          No se pudo generar el OVA
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Ningún recurso se completó, así que no se guardó el OVA. Puedes reintentar la generación
          con la misma configuración.
        </p>
        {errorId && (
          <p className="mt-1 text-xs text-muted-foreground">
            Código de error: <span className="font-mono">{errorId}</span>
          </p>
        )}
      </div>
      <Button className="max-sm:h-11 max-sm:w-full" onClick={onRetryAll}>
        Reintentar generación
      </Button>
    </section>
  );
}

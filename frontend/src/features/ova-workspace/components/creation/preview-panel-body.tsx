import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";
import { Button } from "@/core/components/ui/button";
import { Skeleton } from "@/core/components/ui/skeleton";

import type { ResourceVM } from "../../lib/ova-job-view-model";

interface Props {
  active: ResourceVM | undefined;
  loading: boolean;
  html: string;
  /** La carga del contenido falló: sin esto el panel quedaba en blanco sin explicación. */
  error?: boolean;
  onRetry?: () => void;
}

export function PreviewPanelBody({ active, loading, html, error, onRetry }: Readonly<Props>) {
  if (!active) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="font-display text-base font-semibold">Vista previa del OVA</p>
        <p className="max-w-xs text-sm text-muted-foreground">Los recursos aparecerán aquí a medida que se generen.</p>
      </div>
    );
  }
  if (error) {
    return (
      <div role="alert" className="flex h-full flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-sm text-destructive">No se pudo cargar la vista previa de este recurso.</p>
        {onRetry && (
          <Button variant="outline" size="sm" className="max-sm:h-11" onClick={onRetry}>
            Reintentar
          </Button>
        )}
      </div>
    );
  }
  return (
    <>
      {loading && (
        <div role="status" aria-label="Cargando vista previa" className="space-y-3 p-6">
          <Skeleton className="h-8 w-2/3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      )}
      {!loading && html && <HtmlPreviewFrame html={html} className="block h-full min-h-0 w-full border-0" height={null} title={active.label} />}
    </>
  );
}

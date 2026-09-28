import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";
import { Skeleton } from "@/core/components/ui/skeleton";

import type { ResourceVM } from "../../lib/ova-job-view-model";

interface Props {
  active: ResourceVM | undefined;
  loading: boolean;
  html: string;
}

export function PreviewPanelBody({ active, loading, html }: Readonly<Props>) {
  if (!active) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-1 px-6 text-center">
        <p className="font-display text-base font-semibold">Vista previa del OVA</p>
        <p className="max-w-xs text-sm text-muted-foreground">Los recursos aparecerán aquí a medida que se generen.</p>
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

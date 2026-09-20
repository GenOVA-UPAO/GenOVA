import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";

import type { ResourceVM } from "../../lib/ova-job-view-model";

interface Props {
  active: ResourceVM | undefined;
  loading: boolean;
  html: string;
}

export function PreviewPanelBody({ active, loading, html }: Readonly<Props>) {
  if (!active) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-sm font-medium text-muted-foreground">Vista previa del OVA</p>
        <p className="text-xs text-muted-foreground/70">Los recursos aparecerán aquí a medida que se generen.</p>
      </div>
    );
  }
  return (
    <>
      {loading && (
        <div className="flex h-full items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-muted border-t-primary" />
        </div>
      )}
      {!loading && html && <HtmlPreviewFrame html={html} className="block h-full min-h-0 w-full border-0" height={null} title={active.label} />}
    </>
  );
}

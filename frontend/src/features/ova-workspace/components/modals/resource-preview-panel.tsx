import { Icon } from "@/core/components/icon";

import type { Resource } from "../../lib/ova-types";
import { phaseCfg } from "../../lib/phase-select.config";
import { getResourcePreview } from "../../lib/resource-previews";
import { ResourceWireframe } from "./resource-wireframe";

export function ResourcePreviewPanel({ phase, resource }: Readonly<{ phase: string; resource?: Resource }>) {
  const preview = resource ? getResourcePreview(phase, resource.id) : null;
  if (!resource) return (
    <aside className="flex min-h-64 flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/20 p-6 text-center lg:sticky lg:top-0">
      <span className="flex size-12 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon name="eye" size="text-2xl" /></span>
      <h3 className="font-display font-semibold">Descubre qué genera cada recurso</h3>
      <p className="max-w-xs text-sm text-muted-foreground">Pasa el cursor o selecciona un recurso para ver qué genera</p>
      <p className="text-xs text-muted-foreground">También puedes usar «Vista previa» o enfocar una tarjeta con el teclado.</p>
    </aside>
  );
  if (!preview) return <aside className="space-y-2 rounded-xl border bg-muted/20 p-5"><h3 className="font-semibold">{resource.tipo}</h3><p className="text-sm text-muted-foreground">Vista previa no disponible para este recurso.</p></aside>;
  return (
    <aside className="space-y-4 rounded-xl border bg-muted/20 p-5 lg:sticky lg:top-0">
      <div className="space-y-2"><p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vista previa · {phaseCfg(phase)?.label}</p><h3 className="font-display text-xl font-semibold">{preview.label}</h3><p className="text-sm leading-relaxed">{preview.returns}</p></div>
      <figure className="space-y-2"><ResourceWireframe kind={preview.wire} phaseColor="var(--primary)" /><figcaption className="text-xs text-muted-foreground">Esquema ilustrativo · El contenido se crea al generar el OVA.</figcaption></figure>
      <p className="rounded-lg border bg-background px-3 py-2 text-xs font-medium">{preview.format}</p>
      <h4 className="text-sm font-semibold">Qué incluye</h4>
      <ul className="space-y-3 text-sm">
        {preview.bullets.map((text) => (
          <li key={text} className="flex items-start gap-2"><Icon name="check-circle" className="mt-0.5 text-primary" /><span>{text}</span></li>
        ))}
      </ul>
    </aside>
  );
}

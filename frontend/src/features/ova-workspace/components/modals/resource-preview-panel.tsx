import { Icon } from "@/core/components/icon";

import type { Resource } from "../../lib/ova-types";
import { getResourcePreview } from "../../lib/resource-previews";
import { ResourceWireframe } from "./resource-wireframe";

const PANEL = "rounded-xl border border-border bg-muted/30 p-5";

export function ResourcePreviewPanel({ phase, resource }: Readonly<{ phase: string; resource?: Resource }>) {
  const preview = resource ? getResourcePreview(phase, resource.id) : null;
  if (!resource) return (
    <aside aria-label="Vista previa del recurso" className={`flex min-h-64 flex-col items-center justify-center gap-3 border-dashed text-center ${PANEL}`}>
      <span className="flex size-11 items-center justify-center rounded-full bg-primary/10 text-primary"><Icon name="eye" className="size-5" /></span>
      <h3 className="font-display text-base font-semibold">Descubre qué genera cada recurso</h3>
      <p className="max-w-xs text-sm text-muted-foreground">Pasa el cursor o selecciona un recurso para ver qué genera</p>
    </aside>
  );
  if (!preview) return (
    <aside aria-label="Vista previa del recurso" className={`space-y-1 ${PANEL}`}>
      <h3 className="font-semibold">{resource.tipo}</h3>
      <p className="text-sm text-muted-foreground">Vista previa no disponible para este recurso.</p>
    </aside>
  );
  return (
    <aside aria-label="Vista previa del recurso" className={`space-y-4 ${PANEL}`}>
      <div className="space-y-1.5">
        <h3 className="text-lg leading-snug font-semibold">{preview.label}</h3>
        <p className="text-sm leading-relaxed text-muted-foreground">{preview.returns}</p>
      </div>
      <figure className="space-y-2">
        <ResourceWireframe kind={preview.wire} phaseColor="var(--primary)" />
        <figcaption className="text-xs text-muted-foreground">Esquema ilustrativo. El contenido real se crea al generar el OVA.</figcaption>
      </figure>
      <dl className="space-y-3 text-sm">
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Formato</dt>
          <dd className="mt-0.5 font-medium">{preview.format}</dd>
        </div>
        <div>
          <dt className="text-xs font-medium text-muted-foreground">Qué incluye</dt>
          <dd>
            <ul className="mt-1.5 space-y-2">
              {preview.bullets.map((text) => (
                <li key={text} className="flex items-start gap-2"><Icon name="check" className="mt-0.5 size-4 shrink-0 text-primary" /><span>{text}</span></li>
              ))}
            </ul>
          </dd>
        </div>
      </dl>
    </aside>
  );
}

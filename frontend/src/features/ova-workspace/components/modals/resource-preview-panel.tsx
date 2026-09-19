import type { Resource } from "../../lib/ova-types";
import { phaseCfg } from "../../lib/phase-select.config";
import { getResourcePreview } from "../../lib/resource-previews";
import { ResourceWireframe } from "./resource-wireframe";

export function ResourcePreviewPanel({ phase, resource }: Readonly<{ phase: string; resource?: Resource }>) {
  const preview = resource ? getResourcePreview(phase, resource.id) : null;
  if (!resource) return <aside className="rounded-xl border p-5">Pasa el cursor o selecciona un recurso para ver qué genera</aside>;
  if (!preview) return <aside className="rounded-xl border p-5">Vista previa no disponible para este recurso.</aside>;
  return (
    <aside className="space-y-4 rounded-xl border p-5">
      <h3 className="font-display text-lg">{preview.label}</h3>
      <ResourceWireframe kind={preview.wire} phaseColor={phaseCfg(phase)?.color} />
      <p>{preview.returns}</p>
      <p className="text-xs text-muted-foreground">{preview.format}</p>
      <ul className="list-inside list-disc space-y-2">
        {preview.bullets.map((text) => (
          <li key={text}>{text}</li>
        ))}
      </ul>
    </aside>
  );
}

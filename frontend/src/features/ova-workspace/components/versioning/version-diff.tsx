import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";

import { phaseMeta } from "../../lib/phase-meta";
import type { VersionDiffData } from "../../lib/version-history.types";

/** Comparación lado a lado: la versión anterior a la izquierda, la posterior a la derecha. */
export function VersionDiff({ data }: Readonly<{ data: VersionDiffData }>) {
  return (
    <section aria-label="Comparación de versiones" className="grid gap-4 border-t border-border pt-4 md:grid-cols-2">
      {(
        [
          ["Anterior", data.v1],
          ["Posterior", data.v2],
        ] as const
      ).map(([label, version]) => (
        <div key={label} className="min-w-0 space-y-3">
          <h3 className="text-sm font-semibold">
            {label}: versión {version?.version?.version_number}
          </h3>
          {version?.phases?.map((phase) => (
            <figure key={phase.id} className="space-y-1">
              <figcaption className="text-xs text-muted-foreground">{phaseMeta(phase.phase_type).label || phase.phase_type}</figcaption>
              <HtmlPreviewFrame html={phase.content} title={`${label}: ${phase.phase_type}`} height="35vh" />
            </figure>
          ))}
        </div>
      ))}
    </section>
  );
}

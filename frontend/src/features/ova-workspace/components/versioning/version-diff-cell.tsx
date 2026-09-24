import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";

import { phaseMeta } from "../../lib/phase-meta";
import type { VersionDiffPhase } from "../../lib/version-history.types";

export type DiffSide = "Anterior" | "Posterior";

/** Un recurso de una de las dos versiones; en móvil dice de cuál, porque no hay cabecera de columna. */
export function VersionDiffCell({
  side,
  number,
  phase,
}: Readonly<{ side: DiffSide; number: string; phase: VersionDiffPhase | undefined }>) {
  if (!phase) {
    return (
      <p className="flex min-h-24 items-center justify-center rounded-lg border border-dashed border-border p-4 text-center text-xs text-muted-foreground">
        Este recurso no existe en la versión {number}.
      </p>
    );
  }
  const phaseName = phaseMeta(phase.phase_type).label || phase.phase_type;
  return (
    <figure className="min-w-0 space-y-1">
      <figcaption className="text-xs text-muted-foreground">
        <span className="md:sr-only">
          {side} (versión {number}):{" "}
        </span>
        {phaseName}
      </figcaption>
      <div className="overflow-hidden rounded-lg border border-border">
        <HtmlPreviewFrame
          html={phase.content}
          title={`${side}, versión ${number}: ${phaseName}`}
          height="35vh"
        />
      </div>
    </figure>
  );
}

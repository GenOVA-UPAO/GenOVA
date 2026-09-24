import type { VersionDiffData, VersionDiffPhase } from "../../lib/version-history.types";
import { VersionDiffCell } from "./version-diff-cell";

type DiffSideData = VersionDiffData["v1"];

function sideOf(data: DiffSideData): { number: string; phases: VersionDiffPhase[] } {
  return { number: String(data?.version?.version_number ?? ""), phases: data?.phases ?? [] };
}

/**
 * Comparación lado a lado, recurso por recurso: cada fila pone la versión
 * anterior junto a la posterior para que se lean a la misma altura.
 */
export function VersionDiff({ data }: Readonly<{ data: VersionDiffData }>) {
  const before = sideOf(data.v1);
  const after = sideOf(data.v2);
  const rows = Array.from(
    { length: Math.max(before.phases.length, after.phases.length) },
    (_, index) => index,
  );
  return (
    <section
      aria-label="Comparación de versiones"
      className="space-y-3 border-t border-border pt-4"
    >
      <div className="hidden grid-cols-2 gap-4 md:grid">
        <h3 className="text-sm font-semibold">Anterior: versión {before.number}</h3>
        <h3 className="text-sm font-semibold">Posterior: versión {after.number}</h3>
      </div>
      {rows.map((index) => (
        <div key={index} className="grid gap-3 md:grid-cols-2 md:gap-4">
          <VersionDiffCell side="Anterior" number={before.number} phase={before.phases.at(index)} />
          <VersionDiffCell side="Posterior" number={after.number} phase={after.phases.at(index)} />
        </div>
      ))}
    </section>
  );
}

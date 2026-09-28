import type { VersionDiffData, VersionDiffPhase } from "../../lib/version-history.types";
import { VersionDiffRow } from "./version-diff-row";

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
  const changed = rows.filter(
    (index) => before.phases.at(index)?.content !== after.phases.at(index)?.content,
  ).length;
  return (
    <section
      aria-label="Comparación de versiones"
      className="space-y-3 border-t border-border pt-4"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {changeSummary(changed, rows.length)}
      </p>
      <div className="hidden grid-cols-2 gap-4 md:grid">
        <h3 className="text-sm font-semibold">Anterior: versión {before.number}</h3>
        <h3 className="text-sm font-semibold">Posterior: versión {after.number}</h3>
      </div>
      {rows.map((index) => (
        <VersionDiffRow
          key={index}
          before={{ number: before.number, phase: before.phases.at(index) }}
          after={{ number: after.number, phase: after.phases.at(index) }}
        />
      ))}
    </section>
  );
}

function changeSummary(changed: number, total: number): string {
  if (changed === 0) return "Las dos versiones tienen el mismo contenido.";
  const of = `${String(changed)} de ${String(total)} ${total === 1 ? "recurso" : "recursos"}`;
  return changed === 1 ? `Cambió ${of}.` : `Cambiaron ${of}.`;
}

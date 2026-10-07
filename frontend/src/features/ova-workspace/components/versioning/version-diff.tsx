import type { TFunction } from "i18next";
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation("workspace-versioning");
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
      aria-label={t("diff.label")}
      className="space-y-3 border-t border-border pt-4"
    >
      <p className="text-sm text-muted-foreground" aria-live="polite">
        {changeSummary(t, changed, rows.length)}
      </p>
      <div className="hidden grid-cols-2 gap-4 md:grid">
        <h3 className="text-sm font-semibold">{t("diff.beforeHeading", { number: before.number })}</h3>
        <h3 className="text-sm font-semibold">{t("diff.afterHeading", { number: after.number })}</h3>
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

function changeSummary(t: TFunction, changed: number, total: number): string {
  if (changed === 0) return t("diff.same");
  const key = changed === 1 ? "diff.changedOne" : "diff.changedMany";
  return t(key, { count: total, changed, total });
}

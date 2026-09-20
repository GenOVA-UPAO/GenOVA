import { HtmlPreviewFrame } from "@/core/components/html-preview-frame";

import type { VersionDiffData } from "../../lib/version-history.types";

export function VersionDiff({ data }: Readonly<{ data: VersionDiffData }>) {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {(
        [
          ["Anterior", data.v1],
          ["Posterior", data.v2],
        ] as const
      ).map(([label, version]) => (
        <section key={label} className="min-w-0 space-y-3">
          <h3>
            {label} · v{version?.version?.version_number}
          </h3>
          {version?.phases?.map((phase) => (
            <HtmlPreviewFrame key={phase.id} html={phase.content} title={`${label}: ${phase.phase_type}`} height="35vh" />
          ))}
        </section>
      ))}
    </div>
  );
}

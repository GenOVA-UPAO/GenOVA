import { cn } from "@/core/lib/cn";

import { formatShortDate } from "../../lib/format-date";
import type { PhaseMicroVersion } from "../../lib/version-history.types";

interface Props {
  versions: PhaseMicroVersion[];
  selectedId: string | undefined;
  onSelect: (version: PhaseMicroVersion) => void;
}

/** Lista de versiones de un recurso: una fila por versión, la elegida resaltada. */
export function PhaseVersionList({ versions, selectedId, onSelect }: Readonly<Props>) {
  return (
    <ul aria-label="Versiones" className="divide-y divide-border overflow-hidden rounded-xl border border-border md:max-h-[45vh] md:overflow-y-auto">
      {versions.map((version) => {
        const active = version.id === selectedId;
        return (
          <li key={version.id}>
            <button
              type="button"
              aria-pressed={active}
              onClick={() => {
                onSelect(version);
              }}
              className={cn(
                "flex min-h-11 w-full flex-col items-start justify-center px-3 py-1.5 text-left text-sm transition-colors duration-150 outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset",
                active ? "bg-primary/10 font-semibold text-foreground" : "hover:bg-muted",
              )}
            >
              <span>Versión {version.minor_number}</span>
              {version.created_at && <span className="text-xs font-normal text-muted-foreground">{formatShortDate(version.created_at)}</span>}
            </button>
          </li>
        );
      })}
    </ul>
  );
}

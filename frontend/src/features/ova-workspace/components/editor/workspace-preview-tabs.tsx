import { phaseMeta } from "../../lib/phase-meta";
import type { PhaseWithContent } from "../../lib/types";

interface Props {
  phases: PhaseWithContent[];
  labels: Map<string, string>;
  activeId: string | null;
  onSelect: (id: string) => void;
}

export function WorkspacePreviewTabs({ phases, labels, activeId, onSelect }: Readonly<Props>) {
  const idle = "border border-border bg-background text-muted-foreground hover:bg-muted/60";
  return (
    <nav aria-label="Recursos del OVA" className="flex shrink-0 flex-wrap gap-1 border-b border-border bg-muted/20 px-3 py-2">
      {phases.map((phase) => (
        <button
          key={phase.id}
          type="button"
          onClick={() => {
            onSelect(phase.id);
          }}
          className={`rounded-md px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${phase.id === activeId ? phaseMeta(phase.phase_type).tab : idle}`}
        >
          {labels.get(phase.id) ?? phase.phase_type}
        </button>
      ))}
    </nav>
  );
}

import { Button } from "@/core/components/ui/button";

import { resourceLabel } from "../../lib/resource-label";
import type { PhaseWithContent } from "../../lib/types";

interface Props {
  phases: PhaseWithContent[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onSelectAll: () => void;
}

export function ChatResourceSelect({ phases, selected, onToggle, onSelectAll }: Readonly<Props>) {
  return (
    <fieldset className="space-y-2">
      <legend>Recursos a regenerar</legend>
      <p className="text-xs text-muted-foreground">El prompt aplicará solo a los recursos marcados.</p>
      <Button
        variant="ghost"
        size="sm"
        onClick={onSelectAll}
      >
        Seleccionar todos
      </Button>
      {phases.map((phase) => (
        <label key={phase.id} className="flex gap-2 text-sm">
          <input
            type="checkbox"
            checked={selected.includes(phase.id)}
            onChange={(event) => {
              onToggle(phase.id, event.target.checked);
            }}
          />
          {resourceLabel(phase)}
        </label>
      ))}
    </fieldset>
  );
}

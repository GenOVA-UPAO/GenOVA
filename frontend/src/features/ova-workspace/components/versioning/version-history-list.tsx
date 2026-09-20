import { Button } from "@/core/components/ui/button";

import type { OvaVersionRow } from "../../lib/ova-versioning";

interface Props {
  versions: OvaVersionRow[];
  selected: string[];
  onToggle: (id: string, checked: boolean) => void;
  onRestore: (id: string) => void;
}

export function VersionHistoryList({ versions, selected, onToggle, onRestore }: Readonly<Props>) {
  if (versions.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Aún no hay versiones anteriores. Tras regenerar podrás comparar y restaurar.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {versions.map((version) => (
        <li key={version.id} className="flex flex-wrap items-center gap-3 rounded border p-3">
          <input
            type="checkbox"
            aria-label={`Seleccionar versión ${String(version.version_number)} para comparar`}
            checked={selected.includes(version.id)}
            disabled={selected.length === 2 && !selected.includes(version.id)}
            onChange={(event) => {
              onToggle(version.id, event.target.checked);
            }}
          />
          <span>Versión {version.version_number}</span>
          <Button
            variant="outline"
            disabled={version.is_active}
            onClick={() => {
              onRestore(version.id);
            }}
          >
            Restaurar
          </Button>
        </li>
      ))}
    </ul>
  );
}

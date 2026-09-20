import { Button } from "@/core/components/ui/button";

function selectionButtonLabel(selecting: boolean, count: number): string {
  if (!selecting) return "Seleccionar recursos";
  return `Seleccionando recursos (${String(count)} elegido${count !== 1 ? "s" : ""})`;
}

interface Props {
  busy: boolean;
  selecting: boolean;
  selectedCount: number;
  onRegenAll: () => void;
  onToggleSelect: () => void;
}

export function ChatRegenToolbar({
  busy,
  selecting,
  selectedCount,
  onRegenAll,
  onToggleSelect,
}: Readonly<Props>) {
  return (
    <div className="flex flex-wrap gap-2">
      <Button variant="outline" disabled={busy} onClick={onRegenAll}>
        Regenerar OVA completo
      </Button>
      <Button variant="outline" aria-pressed={selecting} onClick={onToggleSelect}>
        {selectionButtonLabel(selecting, selectedCount)}
      </Button>
    </div>
  );
}

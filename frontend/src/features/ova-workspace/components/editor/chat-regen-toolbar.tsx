import { Icon } from "@/core/components/icon";
import { Button } from "@/core/components/ui/button";
import { cn } from "@/core/lib/cn";

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
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        disabled={busy}
        onClick={onRegenAll}
        className="border-border bg-background font-medium shadow-2xs hover:bg-muted"
      >
        <Icon name="arrow-clockwise" className={cn("size-3.5", busy && "animate-spin")} />
        <span>Regenerar OVA completo</span>
      </Button>
      <Button
        variant={selecting ? "outline" : "ghost"}
        size="sm"
        aria-pressed={selecting}
        onClick={onToggleSelect}
        className={cn(
          "text-xs transition-colors",
          selecting
            ? "border-primary/40 bg-primary/10 font-medium text-primary shadow-2xs ring-1 ring-primary/20 hover:bg-primary/15"
            : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon name={selecting ? "check" : "selection"} className="size-3.5" />
        <span>{selectionButtonLabel(selecting, selectedCount)}</span>
      </Button>
    </div>
  );
}

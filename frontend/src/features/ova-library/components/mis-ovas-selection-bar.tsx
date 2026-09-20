import { Button } from "@/core/components/ui/button";

interface MisOvasSelectionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onDeleteSelected: () => void;
}

/** Barra flotante con acciones masivas cuando hay elementos seleccionados. */
export function MisOvasSelectionBar({
  selectedCount,
  onClearSelection,
  onDeleteSelected,
}: Readonly<MisOvasSelectionBarProps>) {
  if (selectedCount <= 0) return null;

  return (
    <div className="sticky top-4 z-30 flex items-center justify-between rounded-2xl border-2 border-primary/30 bg-primary/10 px-5 py-3.5 shadow-lg backdrop-blur-md animate-in fade-in slide-in-from-top-4">
      <span className="flex items-center gap-2 text-sm font-bold text-primary">
        <span className="flex size-6 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
          {selectedCount}
        </span>
        OVA{selectedCount > 1 ? "s" : ""} seleccionado{selectedCount > 1 ? "s" : ""}
      </span>
      <div className="flex gap-2">
        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          className="font-semibold text-primary hover:bg-primary/20"
        >
          Cancelar
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onDeleteSelected}
          className="shadow-md"
        >
          Eliminar ({selectedCount})
        </Button>
      </div>
    </div>
  );
}

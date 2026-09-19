import { Button } from "@/core/components/ui/button";

interface PapeleraSelectionBarProps {
  selectedCount: number;
  isLoading: boolean;
  onClearSelection: () => void;
  onBulkRestore: () => void;
  onBulkDelete: () => void;
}

/** Barra de acciones por lote para los OVAs seleccionados en la papelera. */
export function PapeleraSelectionBar({
  selectedCount,
  isLoading,
  onClearSelection,
  onBulkRestore,
  onBulkDelete,
}: Readonly<PapeleraSelectionBarProps>) {
  if (selectedCount <= 0) return null;

  return (
    <div className="flex flex-col gap-2 rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 sm:flex-row sm:items-center sm:justify-between animate-in fade-in slide-in-from-top-4">
      <span className="text-sm font-semibold text-primary">
        {selectedCount} OVA{selectedCount > 1 ? "s" : ""} seleccionado{selectedCount > 1 ? "s" : ""}
      </span>
      <div className="flex flex-wrap gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={onClearSelection}
          disabled={isLoading}
        >
          Cancelar
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={onBulkRestore}
          disabled={isLoading}
          className="border-primary/30 text-primary hover:bg-primary/5"
        >
          Restaurar ({selectedCount})
        </Button>
        <Button
          variant="destructive"
          size="sm"
          onClick={onBulkDelete}
          disabled={isLoading}
        >
          Borrar definitivamente ({selectedCount})
        </Button>
      </div>
    </div>
  );
}

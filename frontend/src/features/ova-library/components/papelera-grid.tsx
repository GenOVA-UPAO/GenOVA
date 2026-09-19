import { EmptyState } from "@/core/components/empty-state";
import { Button } from "@/core/components/ui/button";

import type { OvaListItem } from "../lib/types";
import { TrashedOvaCard } from "./cards/trashed-ova-card";

interface PapeleraGridProps {
  isLoading: boolean;
  error: unknown;
  ovas: OvaListItem[];
  selectedIds: Set<string>;
  restoringId: string | null;
  deletingId: string | null;
  onToggleSelect: (id: string) => void;
  onRestore: (id: string) => void;
  onPermanentDelete: (ova: OvaListItem) => void;
  onRetry: () => void;
}

/** Renderiza el estado de carga, error, vacío o las tarjetas de la papelera. */
export function PapeleraGrid({
  isLoading,
  error,
  ovas,
  selectedIds,
  restoringId,
  deletingId,
  onToggleSelect,
  onRestore,
  onPermanentDelete,
  onRetry,
}: Readonly<PapeleraGridProps>) {
  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 animate-spin rounded-full border-4 border-muted border-t-primary" />
          <p className="text-xs text-muted-foreground">Cargando papelera...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-64 items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <p className="text-sm font-medium text-destructive">No se pudo cargar la papelera.</p>
          <Button variant="outline" size="sm" onClick={onRetry}>
            Reintentar
          </Button>
        </div>
      </div>
    );
  }

  if (ovas.length === 0) {
    return (
      <EmptyState
        icon="trash"
        title="Tu papelera está vacía"
        description="Los OVAs que muevas a la papelera aparecerán aquí."
      />
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {ovas.map((ova) => (
        <div key={ova.id} className="animate-in zoom-in-95 duration-300">
          <TrashedOvaCard
            ova={ova}
            isSelected={selectedIds.has(ova.id)}
            isRestoring={restoringId === ova.id}
            isDeleting={deletingId === ova.id}
            onToggleSelect={onToggleSelect}
            onRestore={onRestore}
            onPermanentDelete={onPermanentDelete}
          />
        </div>
      ))}
    </div>
  );
}

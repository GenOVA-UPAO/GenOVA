import { Link } from "react-router";

import { EmptyState } from "@/core/components/empty-state";
import { QueryErrorState } from "@/core/components/query-error-state";
import { SkeletonGrid } from "@/core/components/skeleton-grid";
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
    return <SkeletonGrid count={6} label="Cargando papelera" />;
  }

  if (error) {
    return <QueryErrorState title="No se pudo cargar la papelera" onRetry={onRetry} />;
  }

  if (ovas.length === 0) {
    return (
      <EmptyState
        icon="trash"
        title="Tu papelera está vacía"
        description="Los OVAs que muevas a la papelera aparecerán aquí."
        action={
          <Button asChild variant="outline">
            <Link to="/mis-ovas">Ir a Mis OVAs</Link>
          </Button>
        }
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

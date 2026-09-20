import { QueryErrorState } from "@/core/components/query-error-state";
import { SkeletonGrid } from "@/core/components/skeleton-grid";

import type { OvaJobInfo } from "../lib/job-types";
import type { OvaListItem } from "../lib/types";
import { OvaCard } from "./cards/ova-card";
import { MisOvasEmpty } from "./mis-ovas-empty";

interface MisOvasGridProps {
  isLoading: boolean;
  error: unknown;
  ovas: OvaListItem[];
  jobs: Record<string, OvaJobInfo>;
  selectedIds: Set<string>;
  isFiltering: boolean;
  movingId: string | null;
  downloadingId: string | null;
  duplicatingId: string | null;
  onToggleSelect: (id: string) => void;
  onMoveToTrash: (ova: OvaListItem) => void;
  onEditMetadata: (ova: OvaListItem) => void;
  onDownload: (id: string, title: string) => void;
  onDuplicate: (id: string) => void;
  onResume: (id: string) => void;
  onRetry: () => void;
  onClearFilters: () => void;
}

/** Renderiza el estado de carga, error, vacío o la grilla de tarjetas de OVA. */
export function MisOvasGrid({
  isLoading,
  error,
  ovas,
  jobs,
  selectedIds,
  isFiltering,
  movingId,
  downloadingId,
  duplicatingId,
  onToggleSelect,
  onMoveToTrash,
  onEditMetadata,
  onDownload,
  onDuplicate,
  onResume,
  onRetry,
  onClearFilters,
}: Readonly<MisOvasGridProps>) {
  if (isLoading) return <SkeletonGrid count={6} />;

  if (error) {
    return <QueryErrorState title="No se pudo cargar el historial de OVAs" onRetry={onRetry} />;
  }

  if (ovas.length === 0) {
    return <MisOvasEmpty isFiltering={isFiltering} onClearFilters={onClearFilters} />;
  }

  return (
    <div className="grid grid-cols-1 items-stretch gap-5 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4">
      {ovas.map((ova) => (
        <div key={ova.id} className="h-full animate-in zoom-in-95 duration-300">
          <OvaCard
            ova={ova}
            job={jobs[ova.id]}
            isSelected={selectedIds.has(ova.id)}
            isMoving={movingId === ova.id}
            isDownloading={downloadingId === ova.id}
            isDuplicating={duplicatingId === ova.id}
            onToggleSelect={onToggleSelect}
            onMoveToTrash={onMoveToTrash}
            onDownload={({ id, title }) => { onDownload(id, title); }}
            onDuplicate={onDuplicate}
            onEditMetadata={onEditMetadata}
            onResume={onResume}
          />
        </div>
      ))}
    </div>
  );
}

import { QueryErrorState } from "@/core/components/query-error-state";
import { cn } from "@/core/lib/cn";

import type { OvaJobInfo } from "../lib/job-types";
import { OVA_GRID_CLASS } from "../lib/ova-grid";
import type { OvaListItem } from "../lib/types";
import { OvaCard } from "./cards/ova-card";
import { OvaCardSkeletonGrid } from "./cards/ova-card-skeleton";
import { MisOvasEmpty } from "./mis-ovas-empty";

interface MisOvasGridProps {
  isLoading: boolean;
  /** Mostrando la página anterior mientras llega la nueva. */
  isStale?: boolean;
  error: unknown;
  ovas: OvaListItem[];
  jobs: Record<string, OvaJobInfo>;
  selectedIds: Set<string>;
  search: string;
  status: string;
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

/** Renderiza el estado de carga, error, vacío o la rejilla de tarjetas de OVA. */
export function MisOvasGrid({
  isLoading,
  isStale = false,
  error,
  ovas,
  jobs,
  selectedIds,
  search,
  status,
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
  if (isLoading) return <OvaCardSkeletonGrid />;

  if (error) {
    return <QueryErrorState title="No se pudo cargar la biblioteca de OVAs" onRetry={onRetry} />;
  }

  if (ovas.length === 0) {
    return <MisOvasEmpty search={search} status={status} onClearFilters={onClearFilters} />;
  }

  return (
    <div
      aria-busy={isStale}
      className={cn(OVA_GRID_CLASS, "transition-opacity duration-150", isStale && "opacity-60")}
    >
      {ovas.map((ova) => (
        <OvaCard
          key={ova.id}
          ova={ova}
          job={jobs[ova.id]}
          isSelected={selectedIds.has(ova.id)}
          isMoving={movingId === ova.id}
          isDownloading={downloadingId === ova.id}
          isDuplicating={duplicatingId === ova.id}
          onToggleSelect={onToggleSelect}
          onMoveToTrash={onMoveToTrash}
          onDownload={({ id, title }) => {
            onDownload(id, title);
          }}
          onDuplicate={onDuplicate}
          onEditMetadata={onEditMetadata}
          onResume={onResume}
        />
      ))}
    </div>
  );
}

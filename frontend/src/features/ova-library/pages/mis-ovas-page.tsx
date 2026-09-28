import { useRef } from "react";

import { Icon } from "@/core/components/icon";
import { PageHeader } from "@/core/components/page-header";
import { Button } from "@/core/components/ui/button";

import { OvaListPagination } from "../components/cards/ova-list-pagination";
import { MisOvasFilterBar } from "../components/mis-ovas-filter-bar";
import { MisOvasGrid } from "../components/mis-ovas-grid";
import { MisOvasModals } from "../components/mis-ovas-modals";
import { SelectionToolbar } from "../components/selection-toolbar";
import { useMisOvasPage } from "../hooks/use-mis-ovas-page";
import { ovaNoun } from "../lib/ova-count";

/** Página de gestión de la biblioteca de OVAs con búsqueda, filtros y acciones. */
export function MisOvasPage() {
  const p = useMisOvasPage();
  const listTopRef = useRef<HTMLDivElement>(null);
  const showContent = !p.isLoading && !p.error;
  const { selection } = p;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <MisOvasModals page={p} />

      <PageHeader
        title="Biblioteca de OVAs"
        subtitle="Gestiona, edita y descarga tus recursos educativos generados."
      />

      <div ref={listTopRef} className="scroll-mt-4 space-y-3">
        <MisOvasFilterBar
          search={p.search}
          onSearchChange={p.handleSearchChange}
          status={p.statusFilter}
          onStatusChange={p.handleStatusChange}
        />

        {showContent && p.ovas.length > 0 && (
          <SelectionToolbar
            allSelected={selection.allSelected}
            selectedCount={selection.selectedIds.size}
            summary={`${String(p.totalItems)} ${ovaNoun(p.totalItems)}`}
            disabled={p.actions.bulkLoading}
            onSelectAllChange={selection.selectAll}
            onClearSelection={selection.clear}
            actions={
              <Button
                variant="destructive"
                onClick={() => { p.setShowBulkModal(true); }}
              >
                <Icon name="trash" size="text-base" />
                Mover a la papelera
              </Button>
            }
          />
        )}

        <MisOvasGrid
          isLoading={p.isLoading}
          isStale={p.isStale}
          error={p.error}
          ovas={p.ovas}
          jobs={p.jobs}
          selectedIds={selection.selectedIds}
          search={p.debouncedSearch}
          status={p.statusFilter}
          movingId={p.actions.movingId}
          downloadingId={p.actions.downloadingId}
          duplicatingId={p.actions.duplicatingId}
          onToggleSelect={selection.toggle}
          onMoveToTrash={p.setOvaToTrash}
          onEditMetadata={p.setEditingOva}
          onDownload={(id, title) => { void p.actions.downloadOva(id, title); }}
          onDuplicate={(id) => { void p.actions.duplicateOva(id); }}
          onResume={(id) => { void p.resume(id); }}
          onRetry={() => { void p.refetch(); }}
          onClearFilters={p.handleClearFilters}
        />
      </div>

      {showContent && (
        <OvaListPagination
          label="Paginación de la biblioteca"
          currentPage={p.page}
          totalPages={p.totalPages}
          onPageChange={(page) => {
            p.handlePageChange(page);
            listTopRef.current?.scrollIntoView({ block: "start" });
          }}
        />
      )}
    </div>
  );
}

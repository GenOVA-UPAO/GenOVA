import { PageHeader } from "@/core/components/page-header";

import { OvaListPagination } from "../components/cards/ova-list-pagination";
import { MisOvasFilterBar } from "../components/mis-ovas-filter-bar";
import { MisOvasGrid } from "../components/mis-ovas-grid";
import { MisOvasModals } from "../components/mis-ovas-modals";
import { MisOvasSelectAll } from "../components/mis-ovas-select-all";
import { MisOvasSelectionBar } from "../components/mis-ovas-selection-bar";
import { useMisOvasPage } from "../hooks/use-mis-ovas-page";

/** Página de gestión de la biblioteca de OVAs con búsqueda, filtros y acciones. */
export function MisOvasPage() {
  const p = useMisOvasPage();
  const showContent = !p.isLoading && !p.error;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      <MisOvasModals
        ovaToTrash={p.ovaToTrash}
        movingId={p.actions.movingId}
        showBulkModal={p.showBulkModal}
        selectedCount={p.selectedIds.size}
        bulkLoading={p.actions.bulkLoading}
        editingOva={p.editingOva}
        metadataSaving={p.actions.metadataSaving}
        onCloseTrash={() => { p.setOvaToTrash(null); }}
        onConfirmTrash={() => { void p.handleConfirmTrash(); }}
        onCloseBulkTrash={() => { p.setShowBulkModal(false); }}
        onConfirmBulkTrash={() => { void p.handleConfirmBulkTrash(); }}
        onCloseEditMetadata={() => { p.setEditingOva(null); }}
        onSaveMetadata={p.handleSaveMetadata}
      />

      <PageHeader
        title="Biblioteca de OVAs"
        subtitle="Gestiona, edita y descarga tus recursos educativos generados."
        actions={
          showContent ? (
            <div className="rounded-xl border border-border/50 bg-card/60 px-4 py-2 text-xs font-semibold text-muted-foreground shadow-sm">
              Total: <span className="ml-1 font-bold text-primary">{p.totalItems}</span> OVAs
            </div>
          ) : undefined
        }
      />

      <MisOvasFilterBar
        search={p.search}
        onSearchChange={p.handleSearchChange}
        status={p.statusFilter}
        onStatusChange={p.handleStatusChange}
      />

      {showContent && p.ovas.length > 0 && (
        <MisOvasSelectAll
          allSelected={p.allSelected}
          onSelectAllChange={(checked) => {
            p.setSelectedIds(checked ? new Set(p.ovas.map((o) => o.id)) : new Set());
          }}
        />
      )}

      <MisOvasSelectionBar
        selectedCount={p.selectedIds.size}
        onClearSelection={() => { p.setSelectedIds(new Set()); }}
        onDeleteSelected={() => { p.setShowBulkModal(true); }}
      />

      <MisOvasGrid
        isLoading={p.isLoading}
        error={p.error}
        ovas={p.ovas}
        jobs={p.jobs}
        selectedIds={p.selectedIds}
        isFiltering={Boolean(p.debouncedSearch) || p.statusFilter !== "all"}
        movingId={p.actions.movingId}
        downloadingId={p.actions.downloadingId}
        duplicatingId={p.actions.duplicatingId}
        onToggleSelect={p.handleToggleSelect}
        onMoveToTrash={p.setOvaToTrash}
        onEditMetadata={p.setEditingOva}
        onDownload={(id, title) => { void p.actions.downloadOva(id, title); }}
        onDuplicate={(id) => { void p.actions.duplicateOva(id); }}
        onResume={(id) => { void p.resume(id); }}
        onRetry={() => { void p.refetch(); }}
      />

      {showContent && (
        <OvaListPagination currentPage={p.page} totalPages={p.totalPages} onPageChange={p.setPage} />
      )}
    </div>
  );
}

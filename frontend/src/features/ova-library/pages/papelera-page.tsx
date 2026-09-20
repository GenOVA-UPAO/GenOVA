import { ConfirmModal } from "@/core/components/confirm-modal";
import { PageHeader } from "@/core/components/page-header";
import { Badge } from "@/core/components/ui/badge";

import { OvaListPagination } from "../components/cards/ova-list-pagination";
import { PapeleraGrid } from "../components/papelera-grid";
import { PapeleraSelectAll } from "../components/papelera-select-all";
import { PapeleraSelectionBar } from "../components/papelera-selection-bar";
import { usePapeleraPage } from "../hooks/use-papelera-page";

/** Página de gestión de la papelera con restauración y borrado permanente. */
export function PapeleraPage() {
  const p = usePapeleraPage();
  const showContent = !p.isLoading && !p.error;
  const isModalBusy = p.actions.bulkLoading || Boolean(p.actions.deletingId);

  const headerBadge =
    showContent && p.totalItems > 0 ? (
      <Badge variant="destructive">
        {String(p.totalItems)} OVA{p.totalItems > 1 ? "s" : ""} en papelera
      </Badge>
    ) : undefined;

  return (
    <div className="mx-auto max-w-7xl space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      {p.confirmModal && (
        <ConfirmModal
          title={p.confirmModal.title}
          message={p.confirmModal.message}
          confirmLabel={p.confirmModal.confirmLabel}
          danger
          isLoading={isModalBusy}
          onConfirm={() => { void p.confirmModal?.onConfirm(); }}
          onCancel={() => { p.setConfirmModal(null); }}
        />
      )}

      <PageHeader
        title="Papelera"
        subtitle="OVAs movidos a la papelera. Restáuralos o elimínalos definitivamente."
        actions={headerBadge}
      />

      {showContent && p.ovas.length > 0 && (
        <PapeleraSelectAll
          allSelected={p.allSelected}
          onSelectAllChange={(checked) => {
            p.setSelectedIds(checked ? new Set(p.ovas.map((o) => o.id)) : new Set());
          }}
        />
      )}

      <PapeleraSelectionBar
        selectedCount={p.selectedIds.size}
        isLoading={p.actions.bulkLoading}
        onClearSelection={() => { p.setSelectedIds(new Set()); }}
        onBulkRestore={p.handleBatchRestore}
        onBulkDelete={p.handleBulkPermanentDelete}
      />

      <PapeleraGrid
        isLoading={p.isLoading}
        error={p.error}
        ovas={p.ovas}
        selectedIds={p.selectedIds}
        restoringId={p.actions.restoringId}
        deletingId={p.actions.deletingId}
        onToggleSelect={p.handleToggleSelect}
        onRestore={p.handleRestoreOva}
        onPermanentDelete={p.handlePermanentDelete}
        onRetry={() => { void p.refetch(); }}
      />

      {showContent && (
        <OvaListPagination currentPage={p.page} totalPages={p.totalPages} onPageChange={p.setPage} />
      )}
    </div>
  );
}

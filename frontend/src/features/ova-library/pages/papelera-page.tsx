import i18n from "i18next";
import { useTranslation } from "react-i18next";

import { ConfirmModal } from "@/core/components/confirm-modal";
import { Icon } from "@/core/components/icon";
import { PageHeader } from "@/core/components/page-header";
import { Button } from "@/core/components/ui/button";

import { OvaListPagination } from "../components/cards/ova-list-pagination";
import { PapeleraBulkActions } from "../components/papelera-bulk-actions";
import { PapeleraList } from "../components/papelera-list";
import { SelectionToolbar } from "../components/selection-toolbar";
import { usePapeleraPage } from "../hooks/use-papelera-page";

/** Página de gestión de la papelera con restauración y borrado permanente. */
export function PapeleraPage() {
  useTranslation();
  const DELETE_PHRASE = i18n.t("ova-library:deletePhrase");
  const p = usePapeleraPage();
  const { selection } = p;
  const showContent = !p.isLoading && !p.error;
  const hasItems = showContent && p.totalItems > 0;
  const busy = p.actions.bulkLoading || Boolean(p.actions.deletingId);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      {p.confirmModal && (
        <ConfirmModal
          title={p.confirmModal.title}
          message={p.confirmModal.message}
          confirmLabel={p.confirmModal.confirmLabel}
          danger
          confirmPhrase={DELETE_PHRASE}
          isLoading={busy}
          onConfirm={() => { void p.confirmModal?.onConfirm(); }}
          onCancel={() => { p.setConfirmModal(null); }}
        />
      )}

      <PageHeader
        title={i18n.t("ova-library:papelera")}
        subtitle={i18n.t("ova-library:ovas_movidos_a_la_papelera_restauralos_o_eliminalos_definitivamente")}
        actions={
          hasItems ? (
            <Button
              variant="outline"
              className="text-destructive hover:text-destructive"
              onClick={p.handleEmptyTrash}
              disabled={busy}
            >
              <Icon name="trash" size="text-base" />
              {i18n.t("ova-library:vaciar_papelera")}{" "}
            </Button>
          ) : undefined
        }
      />

      <PapeleraList
        isLoading={p.isLoading}
        isStale={p.isStale}
        error={p.error}
        ovas={p.ovas}
        selectedIds={selection.selectedIds}
        restoringId={p.actions.restoringId}
        deletingId={p.actions.deletingId}
        onToggleSelect={selection.toggle}
        onRestore={p.handleRestoreOva}
        onPermanentDelete={p.handlePermanentDelete}
        onRetry={() => { void p.refetch(); }}
        toolbar={
          <SelectionToolbar
            variant="inset"
            allSelected={selection.allSelected}
            selectedCount={selection.selectedIds.size}
            summary={i18n.t("ova-library:trashCount", { count: p.totalItems })}
            disabled={p.actions.bulkLoading}
            onSelectAllChange={selection.selectAll}
            onClearSelection={selection.clear}
            actions={
              <PapeleraBulkActions disabled={p.actions.bulkLoading} onRestore={p.handleBatchRestore} onDelete={p.handleBulkPermanentDelete} />
            }
          />
        }
      />

      {showContent && (
        <OvaListPagination
          label={i18n.t("ova-library:paginacion_de_la_papelera")}
          currentPage={p.page}
          totalPages={p.totalPages}
          onPageChange={p.handlePageChange}
        />
      )}
    </div>
  );
}

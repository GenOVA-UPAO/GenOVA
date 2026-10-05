import i18n from "i18next";
import { useState } from "react";

import { ovaNoun } from "../lib/ova-count";
import { pageMeta } from "../lib/page-meta";
import type { OvaListItem } from "../lib/types";
import { useTrashList } from "./use-ova-library";
import { useOvaSelection } from "./use-ova-selection";
import { useTrashActions } from "./use-trash-actions";

export interface ConfirmModalState {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

function useTrashConfirmation() {
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);
  const confirmThen = (state: Omit<ConfirmModalState, "onConfirm">, run: () => Promise<boolean>) => {
    setConfirmModal({ ...state, onConfirm: async () => { if (await run()) setConfirmModal(null); } });
  };
  return { confirmModal, setConfirmModal, confirmThen };
}

/** Hook de estado y acciones para la página de Papelera. */
export function usePapeleraPage() {
  const IRREVERSIBLE = i18n.t("ova-library:esta_accion_no_se_puede_deshacer");
  const DELETE_FOREVER = i18n.t("ova-library:eliminar_definitivamente");
  const [page, setPage] = useState(1);
  const { confirmModal, setConfirmModal, confirmThen } = useTrashConfirmation();

  const { data, isLoading, isPlaceholderData, error, refetch } = useTrashList(page);
  const { ovas, totalItems, totalPages } = pageMeta(data);
  if (data && !isPlaceholderData && page > totalPages) setPage(totalPages);

  const selection = useOvaSelection(ovas.map((o) => o.id));
  const actions = useTrashActions();

  const handlePermanentDelete = (ova: OvaListItem) => {
    confirmThen(
      {
        title: DELETE_FOREVER,
        message: i18n.t("ova-library:se_eliminara_value_de_forma_permanente_value", { p0: ova.title ?? "OVA", p1: IRREVERSIBLE }),
        confirmLabel: DELETE_FOREVER,
      },
      async () => {
        const ok = await actions.permanentDeleteOva(ova.id);
        if (ok) selection.remove(ova.id);
        return ok;
      },
    );
  };

  const handleBulkPermanentDelete = () => {
    const ids = Array.from(selection.selectedIds);
    confirmThen(
      {
        title: i18n.t("ova-library:eliminar_value_value_definitivamente", { p0: String(ids.length), p1: ovaNoun(ids.length) }),
        message: i18n.t("ova-library:deleteSelected", { count: ids.length, warning: IRREVERSIBLE }),
        confirmLabel: DELETE_FOREVER,
      },
      async () => {
        const ok = await actions.batchDeleteForever(ids);
        if (ok) selection.clear();
        return ok;
      },
    );
  };

  const handleEmptyTrash = () => {
    confirmThen(
      {
        title: i18n.t("ova-library:vaciar_la_papelera"),
        message: i18n.t("ova-library:deleteAll", { count: totalItems, warning: IRREVERSIBLE }),
        confirmLabel: i18n.t("ova-library:vaciar_papelera"),
      },
      async () => {
        const ok = await actions.emptyTrash();
        if (ok) {
          selection.clear();
          setPage(1);
        }
        return ok;
      },
    );
  };

  const handleRestoreOva = (id: string) => {
    void actions.restoreOva(id).then((ok) => {
      if (ok) selection.remove(id);
    });
  };

  const handleBatchRestore = () => {
    void actions.batchRestore(Array.from(selection.selectedIds)).then((ok) => {
      if (ok) selection.clear();
    });
  };

  const handlePageChange = (next: number) => {
    setPage(next);
    selection.clear();
  };

  return {
    page, handlePageChange, totalItems, totalPages, selection, confirmModal, setConfirmModal,
    handlePermanentDelete, handleBulkPermanentDelete, handleEmptyTrash, handleRestoreOva,
    handleBatchRestore, ovas, actions, isLoading, isStale: isPlaceholderData, error, refetch,
  };
}

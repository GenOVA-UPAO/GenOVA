import { useState } from "react";

import { ovaCountPhrase, ovaNoun } from "../lib/ova-count";
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

const IRREVERSIBLE = "Esta acción no se puede deshacer.";
const DELETE_FOREVER = "Eliminar definitivamente";

/** Hook de estado y acciones para la página de Papelera. */
export function usePapeleraPage() {
  const [page, setPage] = useState(1);
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  const { data, isLoading, isPlaceholderData, error, refetch } = useTrashList(page);
  const { ovas, totalItems, totalPages } = pageMeta(data);
  if (data && !isPlaceholderData && page > totalPages) setPage(totalPages);

  const selection = useOvaSelection(ovas.map((o) => o.id));
  const actions = useTrashActions();

  const confirmThen = (state: Omit<ConfirmModalState, "onConfirm">, run: () => Promise<boolean>) => {
    setConfirmModal({
      ...state,
      onConfirm: async () => {
        if (await run()) setConfirmModal(null);
      },
    });
  };

  const handlePermanentDelete = (ova: OvaListItem) => {
    confirmThen(
      {
        title: DELETE_FOREVER,
        message: `Se eliminará «${ova.title ?? "OVA"}» de forma permanente. ${IRREVERSIBLE}`,
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
        title: `Eliminar ${String(ids.length)} ${ovaNoun(ids.length)} definitivamente`,
        message: `${ids.length === 1 ? "Se eliminará" : "Se eliminarán"} de forma permanente. ${IRREVERSIBLE}`,
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
        title: "Vaciar la papelera",
        message: `${ovaCountPhrase(totalItems, "se eliminará", "se eliminarán")} de forma permanente. ${IRREVERSIBLE}`,
        confirmLabel: "Vaciar papelera",
      },
      async () => {
        const ok = await actions.emptyTrash();
        if (ok) { selection.clear(); setPage(1); }
        return ok;
      },
    );
  };

  const handleRestoreOva = (id: string) => {
    void actions.restoreOva(id).then((ok) => { if (ok) selection.remove(id); });
  };

  const handleBatchRestore = () => {
    void actions.batchRestore(Array.from(selection.selectedIds)).then((ok) => {
      if (ok) selection.clear();
    });
  };

  const handlePageChange = (next: number) => { setPage(next); selection.clear(); };

  return {
    page, handlePageChange, totalItems, totalPages, selection,
    confirmModal, setConfirmModal, handlePermanentDelete, handleBulkPermanentDelete, handleEmptyTrash,
    handleRestoreOva, handleBatchRestore,
    ovas, actions, isLoading, isStale: isPlaceholderData, error, refetch,
  };
}

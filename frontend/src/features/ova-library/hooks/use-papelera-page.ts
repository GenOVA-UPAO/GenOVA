import { useState } from "react";

import type { OvaListItem } from "../lib/types";
import { useTrashList } from "./use-ova-library";
import { useTrashActions } from "./use-trash-actions";

export interface ConfirmModalState {
  title: string;
  message: string;
  confirmLabel: string;
  onConfirm: () => Promise<void>;
}

/** Hook de estado y acciones para la página de Papelera. */
export function usePapeleraPage() {
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [confirmModal, setConfirmModal] = useState<ConfirmModalState | null>(null);

  const { data, isLoading, error, refetch } = useTrashList(page);
  const ovas = data?.ovas ?? [];
  const totalItems = data?.total_items ?? 0;
  const totalPages = data?.total_pages ?? 1;

  const actions = useTrashActions();

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handlePermanentDelete = (ova: OvaListItem) => {
    setConfirmModal({
      title: "Eliminar definitivamente",
      message: `¿Eliminar "${ova.title ?? "OVA"}" de forma permanente?\nEsta acción no se puede deshacer.`,
      confirmLabel: "Eliminar",
      onConfirm: async () => {
        const ok = await actions.permanentDeleteOva(ova.id);
        if (ok) {
          setSelectedIds((prev) => {
            const next = new Set(prev);
            next.delete(ova.id);
            return next;
          });
          setConfirmModal(null);
        }
      },
    });
  };

  const handleBulkPermanentDelete = () => {
    const ids = Array.from(selectedIds);
    setConfirmModal({
      title: "Eliminar múltiples OVAs",
      message: `¿Eliminar ${String(ids.length)} OVAs definitivamente?\nEsta acción no se puede deshacer.`,
      confirmLabel: `Eliminar ${String(ids.length)}`,
      onConfirm: async () => {
        const ok = await actions.batchDeleteForever(ids);
        if (ok) {
          setSelectedIds(new Set());
          setConfirmModal(null);
        }
      },
    });
  };

  const handleRestoreOva = (id: string) => {
    void actions.restoreOva(id).then((ok) => {
      if (ok) {
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(id);
          return next;
        });
      }
    });
  };

  const handleBatchRestore = () => {
    void actions.batchRestore(Array.from(selectedIds)).then((ok) => {
      if (ok) setSelectedIds(new Set());
    });
  };

  const allSelected = ovas.length > 0 && ovas.every((o) => selectedIds.has(o.id));

  return {
    page, setPage, totalItems, totalPages,
    selectedIds, setSelectedIds, handleToggleSelect, allSelected,
    confirmModal, setConfirmModal, handlePermanentDelete, handleBulkPermanentDelete,
    handleRestoreOva, handleBatchRestore,
    ovas, actions, isLoading, error, refetch,
  };
}

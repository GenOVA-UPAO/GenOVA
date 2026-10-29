import i18n from "i18next";
import { useState } from "react";
import { toast } from "sonner";

import { ovaLibraryApi } from "../api/ova-library.api";
import { useOvaMutation } from "./use-ova-library";

/** Maneja las acciones de restauración y borrado permanente en la papelera. */
export function useTrashActions() {
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const restoreMutation = useOvaMutation(ovaLibraryApi.restore);
  const deleteForeverMutation = useOvaMutation(ovaLibraryApi.deleteForever);
  const batchRestoreMutation = useOvaMutation(ovaLibraryApi.batchRestore);
  const batchDeleteForeverMutation = useOvaMutation(ovaLibraryApi.batchDeleteForever);
  const emptyTrashMutation = useOvaMutation(async () => {
    const ids = await ovaLibraryApi.trashIds();
    if (ids.length > 0) await ovaLibraryApi.batchDeleteForever(ids);
    return ids.length;
  });

  const restoreOva = async (id: string) => {
    setRestoringId(id);
    try {
      await restoreMutation.mutateAsync(id);
      toast.success(i18n.t("ova-library:restored_one", { count: 1 }));
      return true;
    } catch {
      toast.error(i18n.t("ova-library:no_se_pudo_restaurar_el_ova"));
      return false;
    } finally {
      setRestoringId(null);
    }
  };

  const permanentDeleteOva = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteForeverMutation.mutateAsync(id);
      toast.success(i18n.t("ova-library:deleted_one", { count: 1 }));
      return true;
    } catch {
      toast.error(i18n.t("ova-library:no_se_pudo_eliminar_el_ova"));
      return false;
    } finally {
      setDeletingId(null);
    }
  };

  const runBulk = async (task: () => Promise<string>, errorMessage: string) => {
    setBulkLoading(true);
    try {
      toast.success(await task());
      return true;
    } catch {
      toast.error(errorMessage);
      return false;
    } finally {
      setBulkLoading(false);
    }
  };

  const batchRestore = (ids: string[]) =>
    runBulk(async () => {
      await batchRestoreMutation.mutateAsync(ids);
      return i18n.t("ova-library:restored", { count: ids.length });
    }, i18n.t("ova-library:no_se_pudieron_restaurar_los_ovas"));

  const batchDeleteForever = (ids: string[]) =>
    runBulk(async () => {
      await batchDeleteForeverMutation.mutateAsync(ids);
      return i18n.t("ova-library:deleted", { count: ids.length });
    }, i18n.t("ova-library:no_se_pudieron_eliminar_los_ovas"));

  const emptyTrash = () =>
    runBulk(async () => {
      const count = await emptyTrashMutation.mutateAsync(undefined);
      return i18n.t("ova-library:emptied", { count });
    }, i18n.t("ova-library:no_se_pudo_vaciar_la_papelera"));

  return {
    restoringId,
    deletingId,
    bulkLoading,
    restoreOva,
    permanentDeleteOva,
    batchRestore,
    batchDeleteForever,
    emptyTrash,
  };
}

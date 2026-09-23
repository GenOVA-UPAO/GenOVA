import { useState } from "react";
import { toast } from "sonner";

import { ovaLibraryApi } from "../api/ova-library.api";
import { ovaCountPhrase } from "../lib/ova-count";
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
      toast.success("OVA restaurado");
      return true;
    } catch {
      toast.error("No se pudo restaurar el OVA");
      return false;
    } finally {
      setRestoringId(null);
    }
  };

  const permanentDeleteOva = async (id: string) => {
    setDeletingId(id);
    try {
      await deleteForeverMutation.mutateAsync(id);
      toast.success("OVA eliminado definitivamente");
      return true;
    } catch {
      toast.error("No se pudo eliminar el OVA");
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
      return ovaCountPhrase(ids.length, "restaurado", "restaurados");
    }, "No se pudieron restaurar los OVAs");

  const batchDeleteForever = (ids: string[]) =>
    runBulk(async () => {
      await batchDeleteForeverMutation.mutateAsync(ids);
      return ovaCountPhrase(ids.length, "eliminado definitivamente", "eliminados definitivamente");
    }, "No se pudieron eliminar los OVAs");

  const emptyTrash = () =>
    runBulk(async () => {
      const count = await emptyTrashMutation.mutateAsync(undefined);
      return `Papelera vaciada: ${ovaCountPhrase(count, "eliminado", "eliminados")}`;
    }, "No se pudo vaciar la papelera");

  return {
    restoringId, deletingId, bulkLoading,
    restoreOva, permanentDeleteOva, batchRestore, batchDeleteForever, emptyTrash,
  };
}

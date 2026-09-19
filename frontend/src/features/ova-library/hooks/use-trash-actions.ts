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

  const batchRestore = async (ids: string[]) => {
    setBulkLoading(true);
    try {
      await batchRestoreMutation.mutateAsync(ids);
      toast.success(`${String(ids.length)} OVAs restaurados`);
      return true;
    } catch {
      toast.error("No se pudieron restaurar los OVAs");
      return false;
    } finally {
      setBulkLoading(false);
    }
  };

  const batchDeleteForever = async (ids: string[]) => {
    setBulkLoading(true);
    try {
      await batchDeleteForeverMutation.mutateAsync(ids);
      toast.success(`${String(ids.length)} OVAs eliminados definitivamente`);
      return true;
    } catch {
      toast.error("No se pudieron eliminar los OVAs");
      return false;
    } finally {
      setBulkLoading(false);
    }
  };

  return {
    restoringId, deletingId, bulkLoading,
    restoreOva, permanentDeleteOva, batchRestore, batchDeleteForever,
  };
}

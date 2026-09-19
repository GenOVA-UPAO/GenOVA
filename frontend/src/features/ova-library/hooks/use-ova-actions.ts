import { useState } from "react";
import { toast } from "sonner";

import { ovaLibraryApi } from "../api/ova-library.api";
import type { MetadataInput } from "../lib/metadata-schema";
import { ovaCountPhrase } from "../lib/ova-count";
import { useOvaMutation } from "./use-ova-library";

/** Maneja las mutaciones y acciones de las tarjetas de OVA con sonner toasts. */
export function useOvaActions() {
  const [movingId, setMovingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [duplicatingId, setDuplicatingId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [metadataSaving, setMetadataSaving] = useState(false);

  const trashMut = useOvaMutation(ovaLibraryApi.moveToTrash);
  const bulkTrashMut = useOvaMutation(ovaLibraryApi.batchMoveToTrash);
  const duplicateMut = useOvaMutation(ovaLibraryApi.duplicate);
  const metaMut = useOvaMutation(
    ({ id, data }: { id: string; data: MetadataInput }) => ovaLibraryApi.updateMetadata(id, data),
  );

  const moveToTrash = async (id: string) => {
    setMovingId(id);
    try {
      await trashMut.mutateAsync(id);
      toast.success("OVA movido a la papelera");
      return true;
    } catch {
      toast.error("No se pudo mover el OVA a la papelera");
      return false;
    } finally {
      setMovingId(null);
    }
  };

  const batchMoveToTrash = async (ids: string[]) => {
    setBulkLoading(true);
    try {
      await bulkTrashMut.mutateAsync(ids);
      toast.success(ovaCountPhrase(ids.length, "movido a la papelera", "movidos a la papelera"));
      return true;
    } catch {
      toast.error("No se pudieron mover los OVAs a la papelera");
      return false;
    } finally {
      setBulkLoading(false);
    }
  };

  const duplicateOva = async (id: string) => {
    setDuplicatingId(id);
    try {
      await duplicateMut.mutateAsync(id);
      toast.success("OVA duplicado correctamente");
    } catch {
      toast.error("No se pudo duplicar el OVA");
    } finally {
      setDuplicatingId(null);
    }
  };

  const downloadOva = async (id: string, title: string) => {
    setDownloadingId(id);
    try {
      await ovaLibraryApi.download(id, title);
      toast.success("Descarga iniciada");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "No se pudo descargar el archivo.");
    } finally {
      setDownloadingId(null);
    }
  };

  const saveMetadata = async (id: string, data: MetadataInput) => {
    setMetadataSaving(true);
    try {
      await metaMut.mutateAsync({ id, data });
      toast.success("Metadatos actualizados");
      return true;
    } catch {
      toast.error("No se pudieron actualizar los metadatos");
      return false;
    } finally {
      setMetadataSaving(false);
    }
  };

  return {
    movingId, downloadingId, duplicatingId, bulkLoading, metadataSaving,
    moveToTrash, batchMoveToTrash, duplicateOva, downloadOva, saveMetadata,
  };
}

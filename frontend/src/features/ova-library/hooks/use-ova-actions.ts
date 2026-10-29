import i18n from "i18next";
import { useState } from "react";
import { toast } from "sonner";

import { exportOva } from "@/core/export/api/ova-export.api";
import type { ExportFormatId } from "@/core/export/lib/formats";

import { ovaLibraryApi } from "../api/ova-library.api";
import type { MetadataInput } from "../lib/metadata-schema";
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
  const metaMut = useOvaMutation(({ id, data }: { id: string; data: MetadataInput }) =>
    ovaLibraryApi.updateMetadata(id, data),
  );

  const moveToTrash = async (id: string) => {
    setMovingId(id);
    try {
      await trashMut.mutateAsync(id);
      toast.success(i18n.t("ova-library:ova_movido_a_la_papelera"));
      return true;
    } catch {
      toast.error(i18n.t("ova-library:no_se_pudo_mover_el_ova_a_la_papelera"));
      return false;
    } finally {
      setMovingId(null);
    }
  };

  const batchMoveToTrash = async (ids: string[]) => {
    setBulkLoading(true);
    try {
      await bulkTrashMut.mutateAsync(ids);
      toast.success(i18n.t("ova-library:moved", { count: ids.length }));
      return true;
    } catch {
      toast.error(i18n.t("ova-library:no_se_pudieron_mover_los_ovas_a_la_papelera"));
      return false;
    } finally {
      setBulkLoading(false);
    }
  };

  const duplicateOva = async (id: string) => {
    setDuplicatingId(id);
    try {
      await duplicateMut.mutateAsync(id);
      toast.success(i18n.t("ova-library:duplicated"));
    } catch {
      toast.error(i18n.t("ova-library:no_se_pudo_duplicar_el_ova"));
    } finally {
      setDuplicatingId(null);
    }
  };

  const downloadOva = async (id: string, format: ExportFormatId) => {
    setDownloadingId(id);
    try {
      await exportOva(id, format);
      toast.success(i18n.t("ova-library:descarga_iniciada"));
    } catch (err) {
      toast.error(
        err instanceof Error ? err.message : i18n.t("ova-library:no_se_pudo_descargar_el_archivo"),
      );
    } finally {
      setDownloadingId(null);
    }
  };

  const saveMetadata = async (id: string, data: MetadataInput) => {
    setMetadataSaving(true);
    try {
      await metaMut.mutateAsync({ id, data });
      toast.success(i18n.t("ova-library:metadatos_actualizados"));
      return true;
    } catch {
      toast.error(i18n.t("ova-library:no_se_pudieron_actualizar_los_metadatos"));
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

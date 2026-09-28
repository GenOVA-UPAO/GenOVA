import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { fetchTemporaryFiles, removeTemporaryFile, uploadTemporaryFiles } from "../api/uploads.api";
import { validateFileAdd } from "../lib/upload-chip-view-model";
import { isIndexing, uploadPhase } from "../lib/upload-rag-status";
import type { UploadItem } from "../lib/upload-types";

const MAX_UPLOAD_FILES = 5;
/** Mientras algún archivo se indexa, la lista se consulta cada tanto hasta que termina. */
const INDEXING_POLL_MS = 1500;

export function uploadsKey(ovaId?: string) {
  return ["ova-temp-uploads", ovaId ?? "crear"] as const;
}

function toUploadItem(item: { upload_id: string; filename: string; content_type: string; size_bytes?: number; rag_status?: unknown }): UploadItem {
  return { clientId: item.upload_id, contentType: item.content_type, filename: item.filename, message: "", ragStatus: item.rag_status as UploadItem["ragStatus"], sizeBytes: item.size_bytes ?? 0, status: "success", uploadId: item.upload_id };
}

function pendingItem(file: File, index: number): UploadItem {
  return { clientId: `pending-${String(index)}-${file.name}`, contentType: file.type, filename: file.name, message: "", sizeBytes: file.size, status: "uploading", uploadId: "" };
}

/**
 * Archivos de referencia de un contexto: el formulario de crear OVA (sin
 * `ovaId`) o el chat del editor de un OVA. Las listas no se mezclan: lo que se
 * adjunta en el chat no aparece en «Archivos» de crear, y viceversa.
 */
export function useOvaUploads(ovaId?: string) {
  const queryClient = useQueryClient();
  const key = uploadsKey(ovaId);
  const [pending, setPending] = useState<UploadItem[]>([]);
  const [uploadError, setUploadError] = useState('');
  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchTemporaryFiles(ovaId),
    select: (data) => (data.items ?? []).map(toUploadItem),
    refetchInterval: (current) => {
      const items = (current.state.data?.items ?? []).map(toUploadItem);
      return isIndexing(items) ? INDEXING_POLL_MS : false;
    },
  });
  const upload = useMutation({
    mutationFn: (files: File[]) => uploadTemporaryFiles(files, ovaId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });
  const remove = useMutation({
    mutationFn: removeTemporaryFile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const server = query.data ?? [];
  const addFiles = async (files: FileList | File[]) => {
    const candidates = Array.from(files);
    const limitError = validateFileAdd(server.length + pending.length, candidates.length);
    setUploadError(limitError ?? '');
    if (limitError) return;
    setPending(candidates.map(pendingItem));
    try {
      const result = await upload.mutateAsync(candidates);
      setUploadError(result.errors?.map((error) => error.message).join(' ') ?? '');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Error al subir archivo.');
    } finally {
      setPending([]);
    }
  };
  const removeUpload = (clientId: string) => { remove.mutate(clientId); };
  /** Tras usarlos (crear el OVA o aplicar un cambio), el backend los saca de la lista. */
  const refresh = () => queryClient.invalidateQueries({ queryKey: key });
  const files = [...pending, ...server];
  const indexing = server.some((file) => uploadPhase(file).phase === "indexing");
  return {
    ...query,
    data: files,
    activeUploadsCount: pending.length,
    addFiles,
    indexing,
    maxUploadFiles: MAX_UPLOAD_FILES,
    refresh,
    removeUpload,
    uploadError,
    /** Ids ya subidos (cualquier estado: el backend informa luego de qué se usó). */
    uploadIds: server.map((file) => file.uploadId).filter(Boolean),
    uploading: pending.length > 0,
  };
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { fetchTemporaryFiles, removeTemporaryFile, uploadTemporaryFiles } from "../api/uploads.api";
import { validateFileAdd } from "../lib/upload-chip-view-model";
import type { UploadItem } from "../lib/upload-types";

const uploadsKey = ["ova-temp-uploads"] as const;
const MAX_UPLOAD_FILES = 5;

function toUploadItem(item: { upload_id: string; filename: string; content_type: string; size_bytes?: number; rag_status?: unknown }): UploadItem {
  return { clientId: item.upload_id, contentType: item.content_type, filename: item.filename, message: "", ragStatus: item.rag_status as UploadItem["ragStatus"], sizeBytes: item.size_bytes ?? 0, status: "success", uploadId: item.upload_id };
}

export function useOvaUploads() {
  const queryClient = useQueryClient();
  const [activeUploads, setActiveUploads] = useState(0);
  const [uploadError, setUploadError] = useState('');
  const query = useQuery({ queryKey: uploadsKey, queryFn: fetchTemporaryFiles, select: (data) => (data.items ?? []).map(toUploadItem) });
  const upload = useMutation({
    mutationFn: uploadTemporaryFiles,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: uploadsKey }),
  });
  const remove = useMutation({
    mutationFn: removeTemporaryFile,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: uploadsKey }),
  });

  const addFiles = async (files: FileList | File[]) => {
    const candidates = Array.from(files);
    const current = query.data?.length ?? 0;
    const limitError = validateFileAdd(current + activeUploads, candidates.length);
    setUploadError(limitError ?? '');
    if (limitError) return;
    setActiveUploads(candidates.length);
    try {
      const result = await upload.mutateAsync(candidates);
      setUploadError(result.errors?.map((error) => error.message).join(' ') ?? '');
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Error al subir archivo.');
    } finally {
      setActiveUploads(0);
    }
  };
  const removeUpload = (clientId: string) => { remove.mutate(clientId); };
  return { ...query, activeUploadsCount: activeUploads, addFiles, maxUploadFiles: MAX_UPLOAD_FILES, removeUpload, uploadError, uploading: activeUploads > 0 };
}

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

import { fetchTemporaryFiles, removeTemporaryFile, uploadTemporaryFiles } from "../api/uploads.api";
import type { UploadItem } from "../lib/upload-types";

const uploadsKey = ["ova-temp-uploads"] as const;
const MAX_UPLOAD_FILES = 5;

function toUploadItem(item: { upload_id: string; filename: string; content_type: string; size_bytes?: number; rag_status?: unknown }): UploadItem {
  return { clientId: item.upload_id, contentType: item.content_type, filename: item.filename, message: "", ragStatus: item.rag_status as UploadItem["ragStatus"], sizeBytes: item.size_bytes ?? 0, status: "success", uploadId: item.upload_id };
}

export function useOvaUploads() {
  const queryClient = useQueryClient();
  const [activeUploads, setActiveUploads] = useState(0);
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
    const selected = candidates.slice(0, Math.max(0, MAX_UPLOAD_FILES - current));
    setActiveUploads(selected.length);
    for (const file of selected) {
      await upload.mutateAsync([file]);
      setActiveUploads((count) => count - 1);
    }
  };
  const removeUpload = (clientId: string) => { remove.mutate(clientId); };
  return { ...query, activeUploadsCount: activeUploads, addFiles, maxUploadFiles: MAX_UPLOAD_FILES, removeUpload, uploadError: upload.error?.message ?? "", uploading: activeUploads > 0 };
}

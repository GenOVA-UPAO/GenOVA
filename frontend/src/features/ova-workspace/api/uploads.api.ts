import { apiJson } from "@/core/lib/http";

import type { ServerItem } from "../services/upload.service";

const UPLOADS_TEMP = "/api/uploads/temp";

export interface UploadResponse {
  items?: ServerItem[];
  errors?: { filename?: string; message?: string; error?: string }[];
}

export function uploadTemporaryFiles(files: Iterable<File>): Promise<UploadResponse> {
  const body = new FormData();
  for (const file of files) body.append("files", file);
  return apiJson<UploadResponse>(UPLOADS_TEMP, { method: "POST", body });
}

export function fetchTemporaryFiles(): Promise<{ items?: ServerItem[] }> {
  return apiJson(UPLOADS_TEMP);
}

export function removeTemporaryFile(uploadId: string): Promise<unknown> {
  return apiJson(`${UPLOADS_TEMP}/${uploadId}`, { method: "DELETE" });
}

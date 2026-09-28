import { apiJson } from "@/core/lib/http";

import type { ServerItem } from "../services/upload.service";

const UPLOADS_TEMP = "/api/uploads/temp";

export interface UploadResponse {
  items?: ServerItem[];
  errors?: { filename?: string; message?: string; error?: string }[];
}

/** Cada lista de archivos es de su contexto: sin `ovaId`, la de crear OVA; con él, la del chat de ese OVA. */
function scoped(ovaId?: string): string {
  return ovaId ? `${UPLOADS_TEMP}?ova_id=${encodeURIComponent(ovaId)}` : UPLOADS_TEMP;
}

export function uploadTemporaryFiles(files: Iterable<File>, ovaId?: string): Promise<UploadResponse> {
  const body = new FormData();
  for (const file of files) body.append("files", file);
  return apiJson<UploadResponse>(scoped(ovaId), { method: "POST", body });
}

export function fetchTemporaryFiles(ovaId?: string): Promise<{ items?: ServerItem[] }> {
  return apiJson(scoped(ovaId));
}

export function removeTemporaryFile(uploadId: string): Promise<unknown> {
  return apiJson(`${UPLOADS_TEMP}/${uploadId}`, { method: "DELETE" });
}

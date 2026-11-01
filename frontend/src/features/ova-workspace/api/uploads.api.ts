import { apiJson } from "@/core/lib/http";
import { COLD_START_TIMEOUT_MS } from "@/core/lib/server-wakeup";

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

/** Piso de ~512 kbps de subida: 64 KB por segundo de margen. */
const UPLOAD_BYTES_PER_SECOND = 64_000;
// Un timeout explícito sustituye al de arranque en frío (90 s): el piso no
// puede ser menor o una subida pequeña con el servidor dormido se abortaría.
const UPLOAD_MIN_TIMEOUT_MS = COLD_START_TIMEOUT_MS;
const UPLOAD_MAX_TIMEOUT_MS = 600_000;

/**
 * El timeout por defecto (15 s) abortaba subidas legítimas: el backend acepta
 * hasta 5 archivos de 20 MB y fetch no resuelve hasta enviar todo el cuerpo.
 */
export function uploadTimeoutMs(files: readonly File[]): number {
  const bytes = files.reduce((total, file) => total + file.size, 0);
  const scaled = Math.ceil(bytes / UPLOAD_BYTES_PER_SECOND) * 1000;
  return Math.min(Math.max(UPLOAD_MIN_TIMEOUT_MS, scaled), UPLOAD_MAX_TIMEOUT_MS);
}

export function uploadTemporaryFiles(files: Iterable<File>, ovaId?: string): Promise<UploadResponse> {
  const list = Array.from(files);
  const body = new FormData();
  for (const file of list) body.append("files", file);
  return apiJson<UploadResponse>(scoped(ovaId), { method: "POST", body }, { timeoutMs: uploadTimeoutMs(list) });
}

export function fetchTemporaryFiles(ovaId?: string): Promise<{ items?: ServerItem[] }> {
  return apiJson(scoped(ovaId));
}

export function removeTemporaryFile(uploadId: string): Promise<unknown> {
  return apiJson(`${UPLOADS_TEMP}/${uploadId}`, { method: "DELETE" });
}

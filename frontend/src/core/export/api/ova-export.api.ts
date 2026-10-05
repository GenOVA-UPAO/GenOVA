import { triggerDownloadFromResponse } from "@/core/lib/download";
import { apiFetch, HttpError } from "@/core/lib/http";

import { type ExportFormatId, getExportFormat } from "../lib/formats";

async function exportError(response: Response): Promise<HttpError> {
  const body = (await response.json().catch(() => null)) as {
    error?: string;
    message?: string;
    detail?: string;
  } | null;
  const message = body?.message ?? body?.detail ?? "Error al exportar la OVA";
  return new HttpError(message, { status: response.status, code: body?.error ?? "", body });
}

/**
 * Exporta la OVA en el formato pedido y dispara la descarga. El nombre sale del
 * `Content-Disposition` (o del JSON `{download_url, filename}` de scorm12).
 */
export async function exportOva(ovaId: string, format: ExportFormatId): Promise<void> {
  const response = await apiFetch(`/api/ovas/${ovaId}/export?format=${encodeURIComponent(format)}`);
  if (!response.ok) throw await exportError(response);
  await triggerDownloadFromResponse(response, `ova-${ovaId}.${getExportFormat(format).extension}`);
}

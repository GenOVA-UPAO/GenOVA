import { triggerDownloadFromResponse } from "@/core/lib/download";
import { apiFetch, apiJson } from "@/core/lib/http";

import type { OvaListItem } from "../lib/types";

export interface OvaListParams {
  page: number;
  search?: string;
  status?: string;
}

export interface OvaListPage {
  ovas?: OvaListItem[];
  total_pages?: number;
  total_items?: number;
}

const PAGE_SIZE = "10";
const json = (body: unknown) => JSON.stringify(body);

export const ovaLibraryApi = {
  list: ({ page, search = "", status = "" }: OvaListParams): Promise<OvaListPage> => {
    const qs = new URLSearchParams({ page: String(page), limit: PAGE_SIZE });
    if (search.trim()) qs.set("search", search.trim());
    if (status.trim()) qs.set("status", status.trim());
    return apiJson(`/api/ovas?${qs.toString()}`);
  },
  trash: (page: number): Promise<OvaListPage> => {
    const qs = new URLSearchParams({ page: String(page), limit: PAGE_SIZE });
    return apiJson(`/api/ovas/papelera?${qs.toString()}`);
  },
  trashCount: (): Promise<{ count: number }> => apiJson("/api/ovas/papelera/count"),
  moveToTrash: (id: string) => apiJson(`/api/ovas/${id}`, { method: "DELETE" }),
  restore: (id: string) => apiJson(`/api/ovas/${id}/restaurar`, { method: "PATCH" }),
  deleteForever: (id: string) => apiJson(`/api/ovas/${id}/permanente`, { method: "DELETE" }),
  batchMoveToTrash: (ids: string[]) =>
    apiJson<{ moved?: unknown[]; message?: string }>("/api/ovas/lote/papelera", {
      method: "POST",
      body: json({ ova_ids: ids }),
    }),
  batchRestore: (ids: string[]) =>
    apiJson("/api/ovas/lote/restaurar", { method: "POST", body: json({ ova_ids: ids }) }),
  batchDeleteForever: (ids: string[]) =>
    apiJson("/api/ovas/lote/permanente", { method: "DELETE", body: json({ ova_ids: ids }) }),
  duplicate: (id: string) =>
    apiJson<{ message?: string; edit_url: string }>(`/api/ovas/${id}/duplicar`, {
      method: "POST",
    }),
  updateMetadata: (id: string, payload: { title?: string; description?: string }) =>
    apiJson(`/api/ovas/${id}/metadata`, { method: "PATCH", body: json(payload) }),
  async download(id: string, title = "ova"): Promise<void> {
    const res = await apiFetch(`/api/ovas/${id}/download`);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(data.message ?? "No se pudo descargar el archivo.");
    }
    await triggerDownloadFromResponse(res, `${title}.zip`);
  },
};

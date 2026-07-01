import { Injectable, resource, signal } from "@angular/core";
import { apiFetch, apiJson } from "@/core/lib/http";
import type { OvaListItem } from "../lib/types";

export interface OvaListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
}

export interface OvaListPage {
  ovas?: OvaListItem[];
  total_pages?: number;
  total_items?: number;
}

@Injectable({ providedIn: "root" })
export class OvaLibraryService {
  // Filters State for Active OVAs
  currentPage = signal(1);
  searchQuery = signal("");
  statusFilter = signal("");

  // Resource for Active OVAs
  activeOvas = resource({
    request: () => ({
      page: this.currentPage(),
      search: this.searchQuery(),
      status: this.statusFilter(),
    }),
    loader: async ({ request }) => {
      const params = new URLSearchParams({
        page: String(request.page),
        limit: "10",
      });
      if (request.search.trim()) params.set("search", request.search.trim());
      if (request.status.trim()) params.set("status", request.status.trim());

      return apiJson(`/api/ovas?${params.toString()}`) as Promise<OvaListPage>;
    },
  });

  // Filters State for Trashed OVAs
  trashCurrentPage = signal(1);

  // Resource for Trashed OVAs
  trashedOvas = resource({
    request: () => ({
      page: this.trashCurrentPage(),
    }),
    loader: async ({ request }) => {
      const params = new URLSearchParams({
        page: String(request.page),
        limit: "10",
      });
      return apiJson(`/api/ovas/papelera?${params.toString()}`) as Promise<OvaListPage>;
    },
  });

  // Actions
  setSearch(query: string) {
    this.searchQuery.set(query);
    this.currentPage.set(1);
  }

  setStatus(status: string) {
    this.statusFilter.set(status);
    this.currentPage.set(1);
  }

  setPage(page: number) {
    this.currentPage.set(page);
  }

  setTrashPage(page: number) {
    this.trashCurrentPage.set(page);
  }

  async deleteOva(ovaId: string) {
    await apiJson(`/api/ovas/${ovaId}`, { method: "DELETE" });
    this.activeOvas.reload();
  }

  async fetchTrashCount(): Promise<{ count: number }> {
    return apiJson("/api/ovas/papelera/count") as Promise<{ count: number }>;
  }

  async restoreOva(ovaId: string) {
    await apiJson(`/api/ovas/${ovaId}/restaurar`, { method: "PATCH" });
    this.trashedOvas.reload();
    this.activeOvas.reload();
  }

  async permanentDeleteOva(ovaId: string) {
    await apiJson(`/api/ovas/${ovaId}/permanente`, { method: "DELETE" });
    this.trashedOvas.reload();
  }

  async batchMoveToTrash(ovaIds: string[]) {
    const result = await apiJson("/api/ovas/lote/papelera", {
      method: "POST",
      body: JSON.stringify({ ova_ids: ovaIds }),
    });
    this.activeOvas.reload();
    return result as { moved?: unknown[]; message?: string };
  }

  async batchRestore(ovaIds: string[]) {
    await apiJson("/api/ovas/lote/restaurar", {
      method: "POST",
      body: JSON.stringify({ ova_ids: ovaIds }),
    });
    this.trashedOvas.reload();
    this.activeOvas.reload();
  }

  async batchPermanentDelete(ovaIds: string[]) {
    await apiJson("/api/ovas/lote/permanente", {
      method: "DELETE",
      body: JSON.stringify({ ova_ids: ovaIds }),
    });
    this.trashedOvas.reload();
  }

  async duplicateOva(ovaId: string) {
    const result = await apiJson(`/api/ovas/${ovaId}/duplicar`, { method: "POST" });
    this.activeOvas.reload();
    return result as { message?: string; edit_url: string };
  }

  async updateOvaMetadata(ovaId: string, payload: { title?: string; description?: string }) {
    await apiJson(`/api/ovas/${ovaId}/metadata`, {
      method: "PATCH",
      body: JSON.stringify(payload),
    });
    this.activeOvas.reload();
  }

  async downloadOvaFile(ovaId: string, title = "ova") {
    const res = await apiFetch(`/api/ovas/${ovaId}/download`);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string; error?: string };
      throw new Error(data?.message || "No se pudo descargar el archivo.");
    }
    const contentType = res.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const data = (await res.json()) as { download_url: string; filename?: string };
      const a = document.createElement("a");
      a.href = data.download_url;
      if (data.filename) a.download = data.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }
    // disk fallback: stream binary
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title}.zip`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

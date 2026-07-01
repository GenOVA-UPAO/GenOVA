import { Injectable } from "@angular/core";
import { apiFetch, apiJson } from "@/core/lib/http";

export interface RegenBody {
  prompt?: string | null;
  faseIds?: string[];
}

@Injectable({
  providedIn: "root",
})
export class OvaEditService {
  fetchOvaEditorData(ovaId: string): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/editar`);
  }

  savePhaseContent(ovaId: string, phaseId: string, content: string): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}`, {
      method: "PATCH",
      body: JSON.stringify({ content }),
    });
  }

  triggerRegen(ovaId: string, { prompt = null, faseIds = [] }: RegenBody = {}): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/regenerar`, {
      method: "POST",
      body: JSON.stringify({ prompt, fase_ids: faseIds }),
    });
  }

  pollRegenProgress(ovaId: string, jobId: string): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/regenerar/${jobId}/progress`);
  }

  fetchOvaVersions(ovaId: string): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/versiones`);
  }

  revertToVersion(ovaId: string, versionId: string): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/versiones/${versionId}/revert`, {
      method: "POST",
    });
  }

  fetchVersionDiff(ovaId: string, v1: string | number, v2: string | number): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/versiones/diff?v1=${v1}&v2=${v2}`);
  }

  addPhase(ovaId: string, phaseType: string, prompt: string): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/fases`, {
      method: "POST",
      body: JSON.stringify({ phase_type: phaseType, prompt }),
    });
  }

  fetchPhaseVersions(ovaId: string, phaseId: string): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/versiones`);
  }

  revertPhaseVersion(ovaId: string, phaseId: string, mvId: string): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}/versiones/${mvId}/revert`, {
      method: "POST",
    });
  }

  deletePhase(ovaId: string, phaseId: string): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/fases/${phaseId}`, { method: "DELETE" });
  }

  reorderPhases(ovaId: string, reorders: unknown): Promise<unknown> {
    return apiJson(`/api/ovas/${ovaId}/fases/reorder`, {
      method: "PATCH",
      body: JSON.stringify({ reorders }),
    });
  }

  async downloadEditedScorm(ovaId: string): Promise<void> {
    const res = await apiFetch(`/api/ovas/${ovaId}/export-scorm`);
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { message?: string };
      throw new Error(data.message || "Error al exportar SCORM");
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
    const disposition = res.headers.get("Content-Disposition") || "";
    const match = disposition.match(/filename="?([^"]+)"?/);
    const filename = match ? match[1] : "ova.zip";
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
}

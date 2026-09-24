import type { RagStatus, UploadItem } from "./upload-types";

/**
 * Fase de un archivo adjunto de cara al docente. «ready» es lo único que
 * garantiza que la IA podrá consultarlo; el resto explica por qué no (todavía).
 */
export type UploadPhase = "uploading" | "indexing" | "ready" | "unusable" | "disabled";

export interface UploadPhaseView {
  phase: UploadPhase;
  /** Texto corto bajo el nombre del archivo. */
  label: string;
  /** Motivo completo, cuando lo hay (se muestra como título y a lectores de pantalla). */
  detail?: string;
}

const DISABLED_DETAIL =
  "La búsqueda en archivos está desactivada en este servidor: la IA no leerá este archivo.";

function plural(count: number, word: string): string {
  return `${String(count)} ${word}${count === 1 ? "" : "s"}`;
}

function indexedView(rag: RagStatus): UploadPhaseView {
  const chunks = rag.chunks ?? 0;
  return {
    phase: "ready",
    label: chunks > 0 ? `Listo · ${plural(chunks, "fragmento")}` : "Listo",
    detail: rag.message,
  };
}

const BY_RAG_STATUS: Record<string, (rag: RagStatus) => UploadPhaseView> = {
  processing: () => ({ phase: "indexing", label: "Indexando…" }),
  indexed: indexedView,
  disabled: () => ({ phase: "disabled", label: "No se usará", detail: DISABLED_DETAIL }),
};

function unusableView(rag: RagStatus): UploadPhaseView {
  return {
    phase: "unusable",
    label: "No se podrá usar",
    detail: rag.message ?? "El archivo no pudo indexarse: la IA no lo leerá.",
  };
}

export function uploadPhase(file: UploadItem): UploadPhaseView {
  if (file.status === "uploading") return { phase: "uploading", label: "Subiendo…" };
  if (file.status === "error") {
    return { phase: "unusable", label: "Error al subir", detail: file.message || undefined };
  }
  const rag = file.ragStatus;
  // Respuesta antigua sin estado RAG: no se promete nada.
  if (!rag?.status) return { phase: "ready", label: "Subido" };
  return (BY_RAG_STATUS[rag.status] ?? unusableView)(rag);
}

export function isIndexing(files: readonly UploadItem[]): boolean {
  return files.some((file) => {
    const phase = uploadPhase(file).phase;
    return phase === "indexing" || phase === "uploading";
  });
}

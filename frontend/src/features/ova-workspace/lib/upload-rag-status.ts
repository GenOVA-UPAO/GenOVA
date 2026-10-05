import i18n from "i18next";

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


function indexedView(rag: RagStatus): UploadPhaseView {
  const chunks = rag.chunks ?? 0;
  return {
    phase: "ready",
    label: chunks > 0 ? i18n.t("workspace:listo_value", { p0: i18n.t("workspace:fragments", { count: chunks }) }) : i18n.t("workspace:listo"),
    detail: rag.message,
  };
}

const BY_RAG_STATUS: Record<string, (rag: RagStatus) => UploadPhaseView> = {
  processing: () => ({ phase: "indexing", label: i18n.t("workspace:indexando") }),
  indexed: indexedView,
  disabled: () => ({ phase: "disabled", label: i18n.t("workspace:no_se_usara"), detail: i18n.t("workspace:fileSearchDisabledHint") }),
};

function unusableView(rag: RagStatus): UploadPhaseView {
  return {
    phase: "unusable",
    label: i18n.t("workspace:no_se_podra_usar"),
    detail: rag.message ?? i18n.t("workspace:el_archivo_no_pudo_indexarse_la_ia_no_lo_leera"),
  };
}

export function uploadPhase(file: UploadItem): UploadPhaseView {
  if (file.status === "uploading") return { phase: "uploading", label: i18n.t("workspace:subiendo") };
  if (file.status === "error") {
    return { phase: "unusable", label: i18n.t("workspace:error_al_subir"), detail: file.message || undefined };
  }
  const rag = file.ragStatus;
  // Respuesta antigua sin estado RAG: no se promete nada.
  if (!rag?.status) return { phase: "ready", label: i18n.t("workspace:subido") };
  return (BY_RAG_STATUS[rag.status] ?? unusableView)(rag);
}

export function isIndexing(files: readonly UploadItem[]): boolean {
  return files.some((file) => {
    const phase = uploadPhase(file).phase;
    return phase === "indexing" || phase === "uploading";
  });
}

import { describe, expect, it } from "vitest";

import { isIndexing, uploadPhase } from "./upload-rag-status";
import type { UploadItem } from "./upload-types";

function file(overrides: Partial<UploadItem> = {}): UploadItem {
  return {
    clientId: "c1",
    uploadId: "u1",
    filename: "apunte.pdf",
    contentType: "application/pdf",
    sizeBytes: 1024,
    status: "success",
    message: "",
    ...overrides,
  };
}

describe("uploadPhase", () => {
  it("distingue subiendo, indexando y listo", () => {
    expect(uploadPhase(file({ status: "uploading", uploadId: "" })).label).toBe("Subiendo…");
    expect(uploadPhase(file({ ragStatus: { status: "processing" } })).phase).toBe("indexing");
    expect(uploadPhase(file({ ragStatus: { status: "indexed", chunks: 4 } }))).toEqual({
      phase: "ready",
      label: "Listo · 4 fragmentos",
      detail: undefined,
    });
  });

  it("un fallo de ingesta dice el motivo", () => {
    const view = uploadPhase(
      file({
        ragStatus: { status: "skipped", reason: "empty_text", message: "No se encontró texto." },
      }),
    );
    expect(view).toEqual({
      phase: "unusable",
      label: "No se podrá usar",
      detail: "No se encontró texto.",
    });
  });

  it("con el RAG desactivado no promete que se usará", () => {
    const view = uploadPhase(file({ ragStatus: { status: "disabled" } }));
    expect(view.phase).toBe("disabled");
    expect(view.label).toBe("No se usará");
    expect(view.detail).toContain("desactivada");
  });

  it("isIndexing mira subidas e indexados en curso", () => {
    expect(isIndexing([file({ ragStatus: { status: "indexed" } })])).toBe(false);
    expect(isIndexing([file({ ragStatus: { status: "processing" } })])).toBe(true);
  });
});

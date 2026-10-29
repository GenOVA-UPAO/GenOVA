import { beforeEach, describe, expect, it, vi } from "vitest";

import { triggerDownloadFromResponse } from "@/core/lib/download";
import { apiFetch } from "@/core/lib/http";

import { exportOva } from "./ova-export.api";

vi.mock("@/core/lib/download", () => ({ triggerDownloadFromResponse: vi.fn() }));
vi.mock("@/core/lib/http", () => ({
  apiFetch: vi.fn(),
  HttpError: class HttpError extends Error {
    status: number;
    code: string;
    constructor(message: string, opts: { status?: number; code?: string } = {}) {
      super(message);
      this.status = opts.status ?? 0;
      this.code = opts.code ?? "";
    }
  },
}));

describe("exportOva", () => {
  beforeEach(() => {
    vi.mocked(apiFetch).mockReset();
    vi.mocked(triggerDownloadFromResponse).mockReset();
  });

  it("pide el endpoint de export con el formato y delega la descarga", async () => {
    const response = { ok: true } as Response;
    vi.mocked(apiFetch).mockResolvedValue(response);
    await exportOva("ova-1", "epub");
    expect(apiFetch).toHaveBeenCalledWith("/api/ovas/ova-1/export?format=epub");
    expect(triggerDownloadFromResponse).toHaveBeenCalledWith(response, "ova-ova-1.epub");
  });

  it("usa la extensión del formato como nombre de respaldo", async () => {
    vi.mocked(apiFetch).mockResolvedValue({ ok: true } as Response);
    await exportOva("ova-1", "elpx");
    expect(triggerDownloadFromResponse).toHaveBeenCalledWith(expect.anything(), "ova-ova-1.elpx");
  });

  it("propaga el mensaje del backend", async () => {
    vi.mocked(apiFetch).mockResolvedValue({
      ok: false,
      status: 400,
      json: () =>
        Promise.resolve({ error: "unknown_format", message: "Formato de exportación no soportado: x" }),
    } as Response);
    await expect(exportOva("ova-1", "html")).rejects.toMatchObject({
      message: "Formato de exportación no soportado: x",
      status: 400,
      code: "unknown_format",
    });
    expect(triggerDownloadFromResponse).not.toHaveBeenCalled();
  });
});

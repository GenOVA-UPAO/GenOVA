import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiJson } from "@/core/lib/http";

import { fetchRegenerationProgress, triggerOvaRegeneration } from "./ova-workspace.api";

vi.mock("@/core/lib/http", () => ({
  apiFetch: vi.fn(),
  apiJson: vi.fn(),
  HttpError: class HttpError extends Error {},
}));

describe("ova workspace API", () => {
  beforeEach(() => vi.mocked(apiJson).mockReset());

  it("starts regeneration with backend field names", async () => {
    vi.mocked(apiJson).mockResolvedValue({ job_id: "regen-1" });
    await triggerOvaRegeneration("ova-1", { prompt: "Mejora", phaseIds: ["phase-1"] });
    expect(apiJson).toHaveBeenCalledWith("/api/ovas/ova-1/regenerar", {
      method: "POST",
      body: JSON.stringify({ prompt: "Mejora", fase_ids: ["phase-1"] }),
    });
  });

  it("reads regeneration progress", async () => {
    vi.mocked(apiJson).mockResolvedValue({ percentage: 50, status: "running" });
    await fetchRegenerationProgress("ova-1", "regen-1");
    expect(apiJson).toHaveBeenCalledWith("/api/ovas/ova-1/regenerar/regen-1/progress");
  });
});

import { beforeEach, describe, expect, it, vi } from "vitest";

import { apiJson } from "@/core/lib/http";

import { uploadTemporaryFiles, uploadTimeoutMs } from "./uploads.api";

vi.mock("@/core/lib/http", () => ({ apiJson: vi.fn() }));

describe("uploads API", () => {
  beforeEach(() => {
    vi.mocked(apiJson).mockReset();
    vi.mocked(apiJson).mockResolvedValue({ items: [] });
  });

  it("gives large uploads more time than the default 15 s timeout", async () => {
    const big = new File([new Uint8Array(20 * 1024 * 1024)], "a.pdf");
    await uploadTemporaryFiles([big], "ova-1");
    const opts = vi.mocked(apiJson).mock.calls[0][2];
    expect(opts?.timeoutMs).toBeGreaterThan(15_000);
    expect(opts?.timeoutMs).toBe(uploadTimeoutMs([big]));
  });

  it("keeps a one-minute floor and a ten-minute ceiling", () => {
    expect(uploadTimeoutMs([new File(["x"], "a.pdf")])).toBe(60_000);
    expect(uploadTimeoutMs([new File([new Uint8Array(100 * 1024 * 1024)], "a.pdf")])).toBe(600_000);
  });
});

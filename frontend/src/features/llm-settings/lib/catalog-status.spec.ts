import { describe, expect, it } from "vitest";

import { connectedProviders, failedProviders, unconnectedProviders } from "./catalog-status";

const status = {
  openrouter: { ok: true, configured: true },
  groq: { ok: false, configured: false },
  opencode: { ok: false, configured: true },
  huggingface: { ok: false, configured: false },
};

describe("catalog-status", () => {
  it("a provider without a platform key is unconnected, not failed", () => {
    expect(unconnectedProviders(status)).toEqual(["groq", "huggingface"]);
    expect(failedProviders(status)).toEqual(["opencode"]);
  });

  it("counts connected providers by key, not by fetch result", () => {
    expect(connectedProviders(status)).toEqual({ connected: 2, total: 4 });
  });

  it("falls back to `ok` when the backend does not send `configured`", () => {
    const legacy = { groq: { ok: true }, openrouter: { ok: false } };
    expect(failedProviders(legacy)).toEqual(["openrouter"]);
    expect(unconnectedProviders(legacy)).toEqual([]);
    expect(connectedProviders(legacy)).toEqual({ connected: 1, total: 2 });
  });

  it("handles a missing status", () => {
    expect(failedProviders(null)).toEqual([]);
    expect(connectedProviders(undefined)).toEqual({ connected: 0, total: 0 });
  });
});

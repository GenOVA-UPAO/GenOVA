import { describe, expect, it } from "vitest";

import {
  connectedProviders,
  failedProviders,
  platformKeyCount,
  unconnectedProviders,
} from "./catalog-status";

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

  it("cuenta las claves de plataforma sobre todos los proveedores de Credenciales", () => {
    // La cabecera decía «2 de 4» (solo los de catálogo de texto) y Credenciales listaba 8.
    const config = {
      providers: [
        "groq",
        "openrouter",
        "opencode",
        "siliconflow",
        "runware",
        "falai",
        "huggingface",
        "cloudflare",
      ],
      platform_config: { groq: "gsk_…abcd", openrouter: "sk-or-…wxyz", opencode: "" },
      server_keys: ["runware"],
    };
    expect(platformKeyCount(config)).toEqual({ connected: 3, total: 8 });
  });

  it("sin datos de plataforma no cuenta (se usa el estado del catálogo)", () => {
    expect(platformKeyCount(undefined)).toBeNull();
    expect(platformKeyCount({ providers: [] })).toBeNull();
  });
});

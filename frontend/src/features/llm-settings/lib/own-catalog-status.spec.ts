import { describe, expect, it } from "vitest";

import {
  failingOwnProviders,
  isProviderDownForUser,
  type OwnCatalogStatus,
  ownKeyView,
  platformStatusForUser,
} from "./own-catalog-status";

const own: OwnCatalogStatus = {
  groq: { state: "connected", models: 7 },
  openrouter: { state: "error", error: "invalid_key", models: 0 },
  opencode: { state: "not_connected" },
  huggingface: { state: "error", error: "unreachable", models: 3 },
};

describe("own-catalog-status", () => {
  it("describe la clave según su lista, no solo si está guardada", () => {
    expect(ownKeyView(own, "groq", true)).toEqual({ kind: "connected", models: 7 });
    expect(ownKeyView(own, "openrouter", true)).toEqual({ kind: "error", code: "invalid_key" });
    expect(ownKeyView(own, "groq", false)).toEqual({ kind: "none" });
  });

  it("recién guardada, mientras llega su lista, se está comprobando", () => {
    expect(ownKeyView(own, "opencode", true)).toEqual({ kind: "checking" });
  });

  it("sin estado (admin o proveedor de imagen) se muestra como guardada", () => {
    expect(ownKeyView(null, "groq", true)).toEqual({ kind: "saved" });
    expect(ownKeyView(own, "runware", true)).toEqual({ kind: "saved" });
  });

  it("lista los proveedores propios que fallan", () => {
    expect(failingOwnProviders(own)).toEqual(["openrouter", "huggingface"]);
    expect(failingOwnProviders(null)).toEqual([]);
  });

  it("quita del estado de plataforma los proveedores donde el usuario usa su clave", () => {
    const platform = {
      groq: { ok: false, configured: false },
      openrouter: { ok: false, configured: true },
      opencode: { ok: false, configured: true },
    };
    expect(platformStatusForUser(platform, own)).toEqual({
      opencode: { ok: false, configured: true },
    });
    expect(platformStatusForUser(platform, null)).toEqual(platform);
    expect(platformStatusForUser(null, own)).toBeNull();
  });

  it("un proveedor está caído para el usuario según su clave si la tiene", () => {
    const platform = {
      groq: { ok: false, configured: true },
      opencode: { ok: false, configured: true },
    };
    expect(isProviderDownForUser(platform, own, "groq")).toBe(false);
    expect(isProviderDownForUser(platform, own, "openrouter")).toBe(true);
    expect(isProviderDownForUser(platform, own, "opencode")).toBe(true);
  });
});

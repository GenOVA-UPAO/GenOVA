import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { AuthExpiredBus } from "./auth-expired-bus";
import { HttpError, apiFetch, apiJson } from "./http";

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

describe("apiFetch", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    fetchMock.mockResolvedValue(jsonResponse({}));
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("envía credentials y el header X-Requested-With", async () => {
    await apiFetch("/api/ovas");
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(init.credentials).toBe("include");
    expect((init.headers as Record<string, string>)["X-Requested-With"]).toBe("XMLHttpRequest");
  });

  it("pone Content-Type JSON solo cuando hay body no-FormData", async () => {
    await apiFetch("/api/ovas", { method: "POST", body: JSON.stringify({ a: 1 }) });
    await apiFetch("/api/uploads", { method: "POST", body: new FormData() });
    const [, jsonInit] = fetchMock.mock.calls[0] as [string, RequestInit];
    const [, formInit] = fetchMock.mock.calls[1] as [string, RequestInit];
    expect((jsonInit.headers as Record<string, string>)["Content-Type"]).toBe("application/json");
    expect((formInit.headers as Record<string, string>)["Content-Type"]).toBeUndefined();
  });

  it("notifica al AuthExpiredBus en 401 de endpoint protegido", async () => {
    const expired = vi.fn();
    const unsub = AuthExpiredBus.subscribe(expired);
    fetchMock.mockResolvedValue(jsonResponse({}, 401));
    await apiFetch("/api/ovas");
    expect(expired).toHaveBeenCalledTimes(1);
    unsub();
  });

  it("no notifica en 401 de endpoints de auth", async () => {
    const expired = vi.fn();
    const unsub = AuthExpiredBus.subscribe(expired);
    fetchMock.mockResolvedValue(jsonResponse({}, 401));
    await apiFetch("/api/auth/me");
    expect(expired).not.toHaveBeenCalled();
    unsub();
  });
});

describe("apiJson", () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("devuelve el body parseado en éxito", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ ok: true }));
    await expect(apiJson("/api/ovas")).resolves.toEqual({ ok: true });
  });

  it("devuelve {} cuando la respuesta no trae body JSON", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 200 }));
    await expect(apiJson("/api/ovas")).resolves.toEqual({});
  });

  it("lanza HttpError con message/detail del backend", async () => {
    fetchMock.mockResolvedValue(jsonResponse({ detail: "OVA no encontrada" }, 404));
    const err = await apiJson("/api/ovas/x").catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpError);
    expect((err as HttpError).message).toBe("OVA no encontrada");
    expect((err as HttpError).status).toBe(404);
  });

  it("usa fallbackMsg cuando el error no trae detail ni message", async () => {
    fetchMock.mockResolvedValue(jsonResponse({}, 500));
    const err = await apiJson("/api/ovas", {}, { fallbackMsg: "No se pudo cargar." }).catch(
      (e: unknown) => e,
    );
    expect((err as HttpError).message).toBe("No se pudo cargar.");
  });

  it("cae a HTTP <status> sin fallbackMsg ni body", async () => {
    fetchMock.mockResolvedValue(new Response(null, { status: 503 }));
    const err = await apiJson("/api/ovas").catch((e: unknown) => e);
    expect((err as HttpError).message).toBe("HTTP 503");
    expect((err as HttpError).body).toBeNull();
  });
});

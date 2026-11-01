import i18n from "i18next";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, HttpError, UPLOAD_TIMEOUT_MS } from "./http";
import { markServerResponded, resetServerWakeup } from "./server-wakeup";

/** fetch que nunca responde y registra la señal de aborto. */
function hangingFetch(signals: AbortSignal[]) {
  return vi.fn((_url: string, init: RequestInit) => {
    signals.push(init.signal!);
    return new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener("abort", () => {
        reject(new DOMException("signal is aborted without reason", "AbortError"));
      });
    });
  });
}

describe("apiFetch: plazos", () => {
  let signals: AbortSignal[];

  beforeEach(() => {
    vi.useFakeTimers();
    resetServerWakeup();
    markServerResponded();
    signals = [];
    vi.stubGlobal("fetch", hangingFetch(signals));
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
    resetServerWakeup();
  });

  it("una subida multipart no se corta a los 15 s con el servidor despierto", async () => {
    const request = apiFetch("/api/uploads/temp", { method: "POST", body: new FormData() });
    request.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(20_000);
    expect(signals[0]?.aborted).toBe(false);

    await vi.advanceTimersByTimeAsync(UPLOAD_TIMEOUT_MS);
    expect(signals[0]?.aborted).toBe(true);
  });

  it("una petición JSON sigue cortándose a los 15 s", async () => {
    const request = apiFetch("/api/ovas", { method: "POST", body: "{}" });
    request.catch(() => undefined);

    await vi.advanceTimersByTimeAsync(15_001);
    expect(signals[0]?.aborted).toBe(true);
  });
});

describe("apiFetch: fallos sin respuesta", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("sin red lanza HttpError traducido en vez de «Failed to fetch»", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));

    const err = await apiFetch("/api/ovas").catch((e: unknown) => e);

    expect(err).toBeInstanceOf(HttpError);
    expect(err).toMatchObject({
      status: 0,
      code: "network",
      message: i18n.t("errors:codes.network"),
    });
  });

  it("al agotar el plazo lanza HttpError con code timeout", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", hangingFetch([]));

    const request = apiFetch("/api/ovas", {}, { timeoutMs: 1000 }).catch((e: unknown) => e);
    await vi.advanceTimersByTimeAsync(1001);

    expect(await request).toMatchObject({
      status: 0,
      code: "timeout",
      message: i18n.t("errors:codes.timeout"),
    });
  });
});

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { apiFetch, UPLOAD_TIMEOUT_MS } from "./http";
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

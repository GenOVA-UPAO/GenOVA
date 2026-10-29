import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { ServerWakeupNotice } from "@/core/components/server-wakeup-notice";

import { apiFetch } from "./http";
import { COLD_START_TIMEOUT_MS, resetServerWakeup, WAKEUP_NOTICE_DELAY_MS } from "./server-wakeup";

describe("aviso de arranque en frío", () => {
  const fetchMock = vi.fn();
  let respond = (_r: Response): void => undefined;

  beforeEach(() => {
    vi.useFakeTimers();
    resetServerWakeup();
    fetchMock.mockReset();
    fetchMock.mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          respond = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("no avisa si la respuesta llega antes de 3 s", async () => {
    render(<ServerWakeupNotice />);
    const p = apiFetch("/api/auth/me");
    await act(() => vi.advanceTimersByTimeAsync(WAKEUP_NOTICE_DELAY_MS - 100));
    expect(screen.queryByRole("status")).toBeNull();
    respond(new Response("{}"));
    await act(() => p);
    await act(() => vi.advanceTimersByTimeAsync(WAKEUP_NOTICE_DELAY_MS));
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("avisa pasados 3 s y lo quita al llegar la respuesta", async () => {
    render(<ServerWakeupNotice />);
    const p = apiFetch("/api/auth/me");
    await act(() => vi.advanceTimersByTimeAsync(WAKEUP_NOTICE_DELAY_MS + 10));
    expect(screen.getByRole("status").textContent).toContain("Despertando el servidor");
    respond(new Response("{}"));
    await act(() => p);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("el aviso desaparece también si la petición falla", async () => {
    render(<ServerWakeupNotice />);
    fetchMock.mockImplementation(
      () =>
        new Promise((_res, rej) => {
          setTimeout(() => {
            rej(new Error("red"));
          }, 5000);
        }),
    );
    const p = apiFetch("/auth/login", { method: "POST", body: "{}" }).catch(() => undefined);
    await act(() => vi.advanceTimersByTimeAsync(4000));
    expect(screen.getByRole("status")).toBeTruthy();
    await act(() => vi.advanceTimersByTimeAsync(2000));
    await act(() => p);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("la primera petición y las de auth aguantan ~90 s; las posteriores, 15 s", async () => {
    const signals: AbortSignal[] = [];
    fetchMock.mockImplementation((_u: string, init: RequestInit) => {
      signals.push(init.signal!);
      return new Promise<Response>(() => undefined);
    });
    void apiFetch("/api/ovas").catch(() => undefined);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(signals[0]?.aborted).toBe(false);
    await vi.advanceTimersByTimeAsync(COLD_START_TIMEOUT_MS - 60_000 + 10);
    expect(signals[0]?.aborted).toBe(true);

    // Con el servidor despierto, una petición normal vuelve al timeout corto.
    fetchMock.mockResolvedValueOnce(new Response("{}"));
    await apiFetch("/api/ovas");
    fetchMock.mockImplementation((_u: string, init: RequestInit) => {
      signals.push(init.signal!);
      return new Promise<Response>(() => undefined);
    });
    void apiFetch("/api/ovas").catch(() => undefined);
    await vi.advanceTimersByTimeAsync(15_010);
    expect(signals[1]?.aborted).toBe(true);
    void apiFetch("/api/auth/me").catch(() => undefined);
    await vi.advanceTimersByTimeAsync(60_000);
    expect(signals[2]?.aborted).toBe(false);
  });
});

import { describe, expect, it, vi } from "vitest";

import { HttpError } from "@/core/lib/http";

import { handleRegenPollTick, MAX_POLL_FAILURES, regenPollDelayMs,type RegenProgressDto } from "./regen-poll";

function deps(status: string) {
  const d = {
    mounted: () => true,
    setProgress: vi.fn(),
    getAssistantId: () => "m1",
    getAssistantLabels: () => undefined,
    patchChat: vi.fn((_id: string, _patch: object) => Promise.resolve()),
    onTerminal: vi.fn(),
    onSuccess: vi.fn(),
    onError: vi.fn(),
    onCancelled: vi.fn(),
    schedule: vi.fn((_id: string, _failures?: number) => undefined),
    fetchProgress: vi.fn((_id: string): Promise<RegenProgressDto> => Promise.resolve({ status, percentage: 100 })),
  };
  return d;
}

describe("handleRegenPollTick", () => {
  it("una regeneración cancelada termina sin reprogramar ni contarse como fallo", async () => {
    const d = deps("cancelled");
    await handleRegenPollTick("job-1", d);
    expect(d.onTerminal).toHaveBeenCalled();
    expect(d.onCancelled).toHaveBeenCalled();
    expect(d.onError).not.toHaveBeenCalled();
    expect(d.schedule).not.toHaveBeenCalled();
    const patch = d.patchChat.mock.lastCall?.[1] as { text: string };
    expect(patch.text).toContain("cancelada");
  });

  it("sigue sondeando mientras corre", async () => {
    const d = deps("generating");
    await handleRegenPollTick("job-1", d);
    expect(d.schedule).toHaveBeenCalledWith("job-1");
  });

  it("un fallo puntual al consultar reintenta en vez de dar la regeneración por fallida", async () => {
    const d = deps("generating");
    d.fetchProgress.mockRejectedValueOnce(new HttpError("Bad Gateway", { status: 502 }));
    await handleRegenPollTick("job-1", d);
    expect(d.schedule).toHaveBeenCalledWith("job-1", 1);
    expect(d.onError).not.toHaveBeenCalled();
    expect(d.onTerminal).not.toHaveBeenCalled();
  });

  it("si el mensaje del hilo ya no existe (404) sigue sondeando", async () => {
    const d = deps("running");
    d.fetchProgress.mockResolvedValue({ status: "running", percentage: 40 });
    d.patchChat.mockRejectedValue(new HttpError("No encontrado", { status: 404 }));
    await expect(handleRegenPollTick("job-1", d)).resolves.toBeUndefined();
    expect(d.schedule).toHaveBeenCalledWith("job-1");
  });

  it("abandona tras varios fallos seguidos, una sola vez", async () => {
    const d = deps("generating");
    d.fetchProgress.mockRejectedValue(new Error("timeout"));
    let failures = 0;
    d.schedule.mockImplementation((_id: string, next?: number) => {
      failures = next ?? 0;
    });
    for (let i = 0; i < MAX_POLL_FAILURES; i += 1) await handleRegenPollTick("job-1", d, failures);
    expect(d.onTerminal).toHaveBeenCalledTimes(1);
    expect(d.onError).toHaveBeenCalledTimes(1);
  });

  it("abandona al momento si el job ya no existe", async () => {
    const d = deps("generating");
    d.fetchProgress.mockRejectedValue(new HttpError("No encontrado", { status: 404 }));
    await handleRegenPollTick("job-1", d);
    expect(d.schedule).not.toHaveBeenCalled();
    expect(d.onError).toHaveBeenCalledTimes(1);
  });

  it("espacia los reintentos con backoff acotado", () => {
    expect([0, 1, 2, 3, 4, 5].map(regenPollDelayMs)).toEqual([3000, 6000, 12000, 24000, 30000, 30000]);
  });
});

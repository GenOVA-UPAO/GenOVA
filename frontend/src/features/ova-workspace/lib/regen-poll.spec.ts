import { describe, expect, it, vi } from "vitest";

import { handleRegenPollTick } from "./regen-poll";

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
    schedule: vi.fn(),
    fetchProgress: vi.fn((_id: string) => Promise.resolve({ status, percentage: 100 })),
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
});

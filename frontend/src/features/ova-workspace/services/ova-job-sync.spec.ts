import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/core/lib/http";
import type { OvaJobsApiService } from "@/core/services/ova-jobs-api.service";

import { OvaJobSyncRunner, POLL_MS } from "./ova-job-sync";

vi.mock("@microsoft/fetch-event-source", () => ({ fetchEventSource: vi.fn(() => Promise.resolve()) }));

function runner(getJobStatus: ReturnType<typeof vi.fn>) {
  return new OvaJobSyncRunner({
    jobsApi: { getJobStatus } as unknown as OvaJobsApiService,
    onSnapshot: vi.fn(),
    onTerminal: vi.fn(),
    getViewModel: () => [],
    isStreaming: () => false,
    setStreaming: vi.fn(),
  });
}

describe("OvaJobSyncRunner polling", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops polling on a permanent 404", async () => {
    const getJobStatus = vi.fn(() => Promise.reject(new HttpError("No encontrado", { status: 404 })));
    runner(getJobStatus).start("j");
    await vi.advanceTimersByTimeAsync(10_000);
    expect(getJobStatus).toHaveBeenCalledTimes(1);
  });

  it("retries transient failures with growing delays", async () => {
    const getJobStatus = vi.fn(() => Promise.reject(new HttpError("Bad Gateway", { status: 502 })));
    runner(getJobStatus).start("j");
    await vi.advanceTimersByTimeAsync(0);
    expect(getJobStatus).toHaveBeenCalledTimes(1);
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(getJobStatus).toHaveBeenCalledTimes(2);
    // El segundo reintento espera el doble (4 × POLL_MS), no POLL_MS.
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(getJobStatus).toHaveBeenCalledTimes(2);
    await vi.advanceTimersByTimeAsync(POLL_MS * 2);
    expect(getJobStatus).toHaveBeenCalledTimes(3);
  });
});

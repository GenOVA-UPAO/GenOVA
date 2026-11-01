import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import type * as authStore from "@/core/auth/auth-store";

import type { OvaListItem } from "../lib/types";
import { useGeneratingJobs } from "./use-generating-jobs";

vi.mock("@/core/auth/auth-store", async (original) => ({
  ...(await original<typeof authStore>()),
  useCurrentUser: () => ({ id: "u1", role: "administrador" }),
}));
const getJob = vi.hoisted(() => vi.fn<(ovaId: string) => Promise<unknown>>());

vi.mock("@/core/services/ova-jobs-api.service", () => ({
  ovaJobsApi: { getJobByOvaId: getJob, resumeJob: vi.fn() },
}));

function setup(ovas: OvaListItem[]) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const invalidate = vi.spyOn(client, "invalidateQueries");
  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  const hook = renderHook(() => useGeneratingJobs(ovas), { wrapper });
  return { ...hook, invalidate };
}

const advance = (ms: number) => act(() => vi.advanceTimersByTimeAsync(ms));

describe("useGeneratingJobs", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it.each(["none", "canceled"])("deja de sondear cuando el job responde '%s'", async (status) => {
    getJob.mockResolvedValue({ status });
    setup([{ id: "o1", status: "generando" }]);
    await advance(12_000);
    expect(getJob).toHaveBeenCalledTimes(1);
  });

  it("sigue sondeando mientras el job está en curso", async () => {
    getJob.mockResolvedValue({ status: "running", resources: [{ status: "done" }, { status: "pending" }] });
    const { result } = setup([{ id: "o1", status: "generando" }]);
    await advance(8_000);
    expect(getJob).toHaveBeenCalledTimes(3);
    expect(result.current.jobs.o1.progress).toEqual({ done: 1, total: 2 });
  });

  it("refresca la lista cuando el job termina y deja de sondear", async () => {
    getJob.mockResolvedValueOnce({ status: "running" }).mockResolvedValue({ status: "done" });
    const { invalidate } = setup([{ id: "o1", status: "generando" }]);
    await advance(0);
    expect(invalidate).not.toHaveBeenCalled();
    await advance(4_000);
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ["ova"] });
    await advance(8_000);
    expect(getJob).toHaveBeenCalledTimes(2);
  });

  it("no sondea los OVAs de otros usuarios (alcance todos)", async () => {
    getJob.mockResolvedValue({ status: "running" });
    setup([{ id: "o2", status: "generando", owner: { id: "otro", full_name: "Ana" } }]);
    await advance(8_000);
    expect(getJob).not.toHaveBeenCalled();
  });

  it("no expone progreso cuando el OVA no tiene job ('none')", async () => {
    getJob.mockResolvedValue({ status: "none" });
    const { result } = setup([{ id: "o1", status: "generando" }]);
    await advance(0);
    expect(result.current.jobs).toEqual({});
  });
});

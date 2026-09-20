import { beforeEach, describe, expect, it, vi } from "vitest";

import { HttpError } from "@/core/lib/http";
import { ovaJobsApi } from "@/core/services/ova-jobs-api.service";

import { cancelOvaJob } from "./ova-jobs.api";

describe("cancelOvaJob", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("returns the backend ack when cancel succeeds", async () => {
    vi.spyOn(ovaJobsApi, "cancelJob").mockResolvedValue({ job_id: "job-1", status: "canceled" });
    await expect(cancelOvaJob("job-1")).resolves.toEqual({ job_id: "job-1", status: "canceled" });
  });

  it("treats 409 as already terminal instead of throwing", async () => {
    vi.spyOn(ovaJobsApi, "cancelJob").mockRejectedValue(
      new HttpError("El job ya no está en curso.", { status: 409 }),
    );
    await expect(cancelOvaJob("job-1")).resolves.toEqual({
      job_id: "job-1",
      status: "already_terminal",
    });
  });

  it("rethrows unexpected cancel errors", async () => {
    vi.spyOn(ovaJobsApi, "cancelJob").mockRejectedValue(new HttpError("Sin permiso", { status: 403 }));
    await expect(cancelOvaJob("job-1")).rejects.toMatchObject({ status: 403 });
  });
});

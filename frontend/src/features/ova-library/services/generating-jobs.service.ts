import { Injectable, inject, type OnDestroy, signal } from "@angular/core";
import { HttpError } from "@/core/lib/http";
import { OvaJobsApiService } from "@/core/services/ova-jobs-api.service";
import type { JobPollData, OvaJobInfo } from "../lib/job-types";
import type { OvaListItem } from "../lib/types";

const POLL_MS = 4000;
const TERMINAL = new Set(["done", "error", "interrupted"]);

function computeProgress(job: JobPollData | null): { done: number; total: number } | null {
  if (!job?.resources?.length) return null;
  const total = job.resources.length;
  const done = job.resources.filter((r) => r.status === "done").length;
  return { done, total };
}

function toJobInfo(data: JobPollData | null): OvaJobInfo | undefined {
  if (!data) return undefined;
  return {
    jobId: data.job_id ?? null,
    status: data.status ?? null,
    progress: computeProgress(data),
    isInterrupted: data.status === "interrupted",
  };
}

@Injectable({ providedIn: "root" })
export class GeneratingJobsService implements OnDestroy {
  private creation = inject(OvaJobsApiService);
  private jobsState = signal<Record<string, OvaJobInfo>>({});
  private rawJobsState = signal<Record<string, JobPollData | null>>({});
  private pollTimers = new Map<string, ReturnType<typeof setTimeout>>();
  private destroyed = false;

  jobs = this.jobsState.asReadonly();

  syncFromOvas(ovas: OvaListItem[]) {
    const ids = new Set(ovas.filter((o) => o.status === "generando").map((o) => o.id));
    for (const [id, timer] of this.pollTimers) {
      if (!ids.has(id)) {
        clearTimeout(timer);
        this.pollTimers.delete(id);
        this.clearJob(id);
      }
    }
    for (const id of ids) {
      if (!this.pollTimers.has(id)) void this.pollOnce(id);
    }
  }

  async resume(ovaId: string) {
    const data = this.rawJobsState()[ovaId];
    if (!data?.job_id) return;
    await this.creation.resumeJob(data.job_id, []);
    void this.pollOnce(ovaId);
  }

  ngOnDestroy() {
    this.destroyed = true;
    for (const timer of this.pollTimers.values()) clearTimeout(timer);
    this.pollTimers.clear();
  }

  private clearJob(ovaId: string) {
    this.jobsState.update((prev) => {
      const next = { ...prev };
      delete next[ovaId];
      return next;
    });
    this.rawJobsState.update((prev) => {
      const next = { ...prev };
      delete next[ovaId];
      return next;
    });
  }

  private setJob(ovaId: string, data: JobPollData | null) {
    this.rawJobsState.update((prev) => ({ ...prev, [ovaId]: data }));
    const info = toJobInfo(data);
    this.jobsState.update((prev) => {
      const next = { ...prev };
      if (info) next[ovaId] = info;
      else delete next[ovaId];
      return next;
    });
  }

  private schedulePoll(ovaId: string) {
    if (this.destroyed) return;
    const timer = setTimeout(() => void this.pollOnce(ovaId), POLL_MS);
    this.pollTimers.set(ovaId, timer);
  }

  private async pollOnce(ovaId: string) {
    if (this.destroyed) return;
    this.pollTimers.delete(ovaId);
    try {
      const data = (await this.creation.getJobByOvaId(ovaId)) as JobPollData;
      this.setJob(ovaId, data);
      if (!data?.status || !TERMINAL.has(data.status)) this.schedulePoll(ovaId);
    } catch (err) {
      if (err instanceof HttpError && err.status === 404) {
        this.setJob(ovaId, null);
        return;
      }
      this.schedulePoll(ovaId);
    }
  }
}

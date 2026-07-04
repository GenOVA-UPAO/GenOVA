import { fetchEventSource } from "@microsoft/fetch-event-source";

import { API_BASE } from "@/core/lib/http";
import type { OvaJobsApiService } from "@/core/services/ova-jobs-api.service";

import { jobOutcome, type JobSnapshot } from "../lib/ova-job-view-model";

export const POLL_MS = 2000;
export const STREAM_HEARTBEAT_MS = 15000;

export interface OvaJobSyncDeps {
  jobsApi: OvaJobsApiService;
  onSnapshot: (snapshot: JobSnapshot) => void;
  onTerminal: () => void;
  getViewModel: () => ReturnType<typeof import("../lib/ova-job-view-model").toResourceViewModel>;
  isStreaming: () => boolean;
  setStreaming: (value: boolean) => void;
}

export class OvaJobSyncRunner {
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private sseCtrl: AbortController | null = null;

  constructor(private deps: OvaJobSyncDeps) {}

  start(jobId: string) {
    this.stop();
    this.startSse(jobId);
    this.triggerPoll(jobId);
  }

  stop() {
    this.stopSse();
    this.stopPolling();
  }

  pollNow(jobId: string) {
    this.stopPolling();
    this.triggerPoll(jobId);
  }

  private startSse(jobId: string) {
    this.sseCtrl = new AbortController();

    fetchEventSource(`${API_BASE}/api/ova/jobs/${jobId}/stream`, {
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      signal: this.sseCtrl.signal,
      openWhenHidden: true,
      onopen: (res) => {
        this.deps.setStreaming(res.ok);
        return Promise.resolve();
      },
      onmessage: (ev) => {
        if (ev.event !== "progress" && ev.event !== "done") return;
        try {
          const snapshot = JSON.parse(ev.data) as JobSnapshot;
          this.deps.onSnapshot(snapshot);
          if (jobOutcome(snapshot, this.deps.getViewModel()).isTerminal) {
            this.stop();
          }
        } catch {
          // malformed frame, polling will fix
        }
      },
      onerror: () => {
        this.deps.setStreaming(false);
        throw new Error("sse-stream-failed");
      },
      onclose: () => {
        this.deps.setStreaming(false);
      },
    }).catch(() => {
      this.deps.setStreaming(false);
    });
  }

  private stopSse() {
    if (this.sseCtrl) {
      this.sseCtrl.abort();
      this.sseCtrl = null;
    }
    this.deps.setStreaming(false);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private triggerPoll(jobId: string) {
    this.deps.jobsApi
      .getJobStatus(jobId)
      .then((raw) => {
        const snapshot = raw as JobSnapshot;
        this.deps.onSnapshot(snapshot);
        if (jobOutcome(snapshot, this.deps.getViewModel()).isTerminal) {
          this.stop();
        } else {
          const delay = this.deps.isStreaming() ? STREAM_HEARTBEAT_MS : POLL_MS;
          this.pollTimer = setTimeout(() => {
            this.triggerPoll(jobId);
          }, delay);
        }
      })
      .catch(() => {
        const delay = this.deps.isStreaming() ? STREAM_HEARTBEAT_MS : POLL_MS;
        this.pollTimer = setTimeout(() => {
          this.triggerPoll(jobId);
        }, delay);
      });
  }
}

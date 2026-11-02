import { fetchEventSource } from "@microsoft/fetch-event-source";

import { API_BASE, HttpError } from "@/core/lib/http";
import type { OvaJobsApiService } from "@/core/services/ova-jobs-api.service";

import { jobOutcome, type JobSnapshot,type toResourceViewModel } from "../lib/ova-job-view-model";

export const POLL_MS = 2000;
export const STREAM_HEARTBEAT_MS = 15000;
export const MAX_RETRY_MS = 60_000;

/** 4xx que no se arregla reintentando (job ajeno, borrado o mal escrito). */
function isPermanentFailure(error: unknown): boolean {
  return (
    error instanceof HttpError &&
    error.status >= 400 &&
    error.status < 500 &&
    error.status !== 408 &&
    error.status !== 429
  );
}

export interface OvaJobSyncDeps {
  jobsApi: OvaJobsApiService;
  onSnapshot: (snapshot: JobSnapshot) => void;
  onTerminal: () => void;
  getViewModel: () => ReturnType<typeof toResourceViewModel>;
  isStreaming: () => boolean;
  setStreaming: (value: boolean) => void;
}

export class OvaJobSyncRunner {
  private pollTimer: ReturnType<typeof setTimeout> | null = null;
  private sseCtrl: AbortController | null = null;
  // A generation counter prevents an in-flight request from reviving a stopped runner.
  private pollGen = 0;
  // Fallos seguidos de la consulta de estado: espacian los reintentos.
  private failures = 0;

  constructor(private deps: OvaJobSyncDeps) {}

  start(jobId: string) {
    this.stop();
    this.failures = 0;
    this.startSse(jobId);
    this.triggerPoll(jobId, this.pollGen);
  }

  stop() {
    this.stopSse();
    this.stopPolling();
  }

  pollNow(jobId: string) {
    this.stopPolling();
    this.triggerPoll(jobId, this.pollGen);
  }

  private startSse(jobId: string) {
    this.sseCtrl = new AbortController();

    fetchEventSource(`${API_BASE}/api/jobs/${jobId}/stream`, {
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
            this.deps.onTerminal();
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
    this.pollGen += 1;
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private triggerPoll(jobId: string, gen: number) {
    this.deps.jobsApi
      .getJobStatus(jobId)
      .then((raw) => {
        if (gen !== this.pollGen) return;
        this.failures = 0;
        const snapshot = raw as JobSnapshot;
        this.deps.onSnapshot(snapshot);
        if (jobOutcome(snapshot, this.deps.getViewModel()).isTerminal) {
          this.stop();
          this.deps.onTerminal();
        } else {
          const delay = this.deps.isStreaming() ? STREAM_HEARTBEAT_MS : POLL_MS;
          this.pollTimer = setTimeout(() => {
            this.triggerPoll(jobId, gen);
          }, delay);
        }
      })
      .catch((error: unknown) => {
        if (gen !== this.pollGen) return;
        // Un 404/403 no cambia por insistir: antes se consultaba cada 2 s
        // mientras la pestaña siguiera abierta.
        if (isPermanentFailure(error)) {
          this.stop();
          return;
        }
        this.failures += 1;
        const base = this.deps.isStreaming() ? STREAM_HEARTBEAT_MS : POLL_MS;
        const delay = Math.min(base * 2 ** Math.min(this.failures, 4), MAX_RETRY_MS);
        this.pollTimer = setTimeout(() => {
          this.triggerPoll(jobId, gen);
        }, delay);
      });
  }
}

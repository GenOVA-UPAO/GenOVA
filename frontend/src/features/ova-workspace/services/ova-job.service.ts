import { computed, Injectable, inject, type OnDestroy, signal } from "@angular/core";
import { fetchEventSource } from "@microsoft/fetch-event-source";
import { API_BASE } from "@/core/lib/http";
import {
  JobSnapshot,
  jobOutcome,
  pruneSelection,
  type Selections,
  toResourceViewModel,
} from "../lib/ova-job-view-model";
import { OvaCreationService, type StartJobArgs } from "./ova-creation.service";

const POLL_MS = 2000;
const STREAM_HEARTBEAT_MS = 15000;

const ALL_PHASES = ["engage", "explore", "explain", "elaborate", "evaluate"];
const EMPTY_SELECTIONS = Object.fromEntries(ALL_PHASES.map((p) => [p, []])) as Selections;

@Injectable({
  providedIn: "root",
})
export class OvaJobService implements OnDestroy {
  private creationService = inject(OvaCreationService);

  // State
  private jobIdState = signal<string | null>(null);
  private selectionsState = signal<Selections>(EMPTY_SELECTIONS);
  private startingState = signal(false);
  private errorState = signal("");
  private selectedFailedIdsState = signal<string[]>([]);
  private jobSnapshot = signal<JobSnapshot | null>(null);
  private streamingState = signal(false);

  // Polling / SSE internals
  private pollTimer: any = null;
  private sseCtrl: AbortController | null = null;

  // Public accessors
  jobId = this.jobIdState.asReadonly();
  job = this.jobSnapshot.asReadonly();
  error = this.errorState.asReadonly();
  selections = this.selectionsState.asReadonly();
  starting = this.startingState.asReadonly();

  viewModel = computed(() =>
    toResourceViewModel(this.jobSnapshot()?.resources || [], this.selectionsState()),
  );
  outcome = computed(() => jobOutcome(this.jobSnapshot(), this.viewModel()));
  selectedFailedIds = computed(() =>
    pruneSelection(this.selectedFailedIdsState(), this.viewModel()),
  );

  phase = computed(() => {
    if (this.startingState()) return "starting";
    if (this.jobIdState() && this.jobSnapshot() && this.outcome().isTerminal) return "terminal";
    if (this.jobIdState()) return "polling";
    return "idle";
  });

  // Flow Actions
  async start(args: StartJobArgs) {
    this.selectionsState.set(args.resources as any); // Simplification for port
    this.errorState.set("");
    this.selectedFailedIdsState.set([]);
    this.startingState.set(true);
    this.jobIdState.set(null);
    this.stopPolling();
    this.stopSse();

    try {
      const { job_id } = await this.creationService.startJob(args);
      this.jobIdState.set(job_id);
      this.startSyncFlow();
    } catch (err: any) {
      this.errorState.set(err.message || "No se pudo iniciar la generación.");
    } finally {
      this.startingState.set(false);
    }
  }

  reset() {
    this.stopPolling();
    this.stopSse();
    this.jobIdState.set(null);
    this.selectionsState.set(EMPTY_SELECTIONS);
    this.errorState.set("");
    this.selectedFailedIdsState.set([]);
    this.startingState.set(false);
    this.jobSnapshot.set(null);
  }

  restore(existingJobId: string) {
    this.errorState.set("");
    this.selectedFailedIdsState.set([]);
    this.jobIdState.set(existingJobId);
    this.startSyncFlow();
  }

  async resumeAndPoll(ids: string[]) {
    const id = this.jobIdState();
    if (!id) return;
    this.errorState.set("");
    try {
      await this.creationService.resumeJob(id, ids);
      this.triggerManualPoll();
    } catch (err: any) {
      this.errorState.set(err.message || "No se pudo reintentar la generación.");
    }
  }

  retryOne(resourceId: string) {
    return this.resumeAndPoll([resourceId]);
  }

  retrySelected() {
    return this.resumeAndPoll(this.selectedFailedIds());
  }

  retryAll() {
    return this.resumeAndPoll([]);
  }

  toggleFailed(resourceId: string) {
    const curr = this.selectedFailedIdsState();
    if (curr.includes(resourceId)) {
      this.selectedFailedIdsState.set(curr.filter((x) => x !== resourceId));
    } else {
      this.selectedFailedIdsState.set([...curr, resourceId]);
    }
  }

  selectAllFailed() {
    this.selectedFailedIdsState.set(
      this.viewModel()
        .filter((r) => r.selectable)
        .map((r) => r.id),
    );
  }

  async cancel() {
    const id = this.jobIdState();
    if (!id) return;
    this.errorState.set("");
    try {
      await this.creationService.cancelJob(id);
      this.triggerManualPoll();
    } catch (err: any) {
      this.errorState.set(err.message || "No se pudo cancelar la generación.");
    }
  }

  ngOnDestroy() {
    this.reset();
  }

  // --- Internals for SSE & Polling ---

  private startSyncFlow() {
    this.stopSse();
    this.stopPolling();

    if (this.outcome().isTerminal) return;

    const id = this.jobIdState();
    if (!id) return;

    this.startSse(id);
    this.triggerManualPoll(); // Fetch once immediately
  }

  private startSse(jobId: string) {
    this.sseCtrl = new AbortController();

    fetchEventSource(`${API_BASE}/api/ova/jobs/${jobId}/stream`, {
      credentials: "include",
      headers: { "X-Requested-With": "XMLHttpRequest" },
      signal: this.sseCtrl.signal,
      openWhenHidden: true,
      onopen: async (res) => {
        this.streamingState.set(res.ok);
      },
      onmessage: (ev) => {
        if (ev.event !== "progress" && ev.event !== "done") return;
        try {
          const snapshot = JSON.parse(ev.data);
          this.jobSnapshot.set(snapshot);
          if (jobOutcome(snapshot, this.viewModel()).isTerminal) {
            this.stopSyncFlow();
          }
        } catch {
          // malformed frame, polling will fix
        }
      },
      onerror: () => {
        this.streamingState.set(false);
        throw new Error("sse-stream-failed");
      },
      onclose: () => {
        this.streamingState.set(false);
      },
    }).catch(() => {
      this.streamingState.set(false);
    });
  }

  private stopSse() {
    if (this.sseCtrl) {
      this.sseCtrl.abort();
      this.sseCtrl = null;
    }
    this.streamingState.set(false);
  }

  private stopPolling() {
    if (this.pollTimer) {
      clearTimeout(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private stopSyncFlow() {
    this.stopSse();
    this.stopPolling();
  }

  private triggerManualPoll() {
    const id = this.jobIdState();
    if (!id) return;

    this.stopPolling();

    this.creationService
      .getJobStatus(id)
      .then((snapshot: any) => {
        this.jobSnapshot.set(snapshot);
        if (jobOutcome(snapshot, this.viewModel()).isTerminal) {
          this.stopSyncFlow();
        } else {
          // Schedule next poll
          const delay = this.streamingState() ? STREAM_HEARTBEAT_MS : POLL_MS;
          this.pollTimer = setTimeout(() => this.triggerManualPoll(), delay);
        }
      })
      .catch(() => {
        // Retry in normal interval
        const delay = this.streamingState() ? STREAM_HEARTBEAT_MS : POLL_MS;
        this.pollTimer = setTimeout(() => this.triggerManualPoll(), delay);
      });
  }
}

export { JobSnapshot };

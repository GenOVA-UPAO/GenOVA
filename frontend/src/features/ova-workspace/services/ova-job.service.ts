import { computed, inject, Injectable, type OnDestroy, signal } from "@angular/core";

import { OvaJobsApiService } from "@/core/services/ova-jobs-api.service";

import {
  jobOutcome,
  type JobSnapshot,
  pruneSelection,
  resourcesFingerprint,
  type Selections,
  STALL_MS,
  toResourceViewModel,
} from "../lib/ova-job-view-model";
import { OvaCreationService, toResourcesPayload } from "./ova-creation.service";
import { OvaJobSyncRunner } from "./ova-job-sync";

export interface StartJobArgs {
  prompt: string;
  uploadIds?: string[];
  selections: Selections;
  theme?: unknown;
  resourceConfigs?: Record<string, unknown>;
}
const EMPTY_SELECTIONS = Object.fromEntries(
  ["engage", "explore", "explain", "elaborate", "evaluate"].map((p) => [p, []]),
) as Selections;

@Injectable({ providedIn: "root" })
export class OvaJobService implements OnDestroy {
  private creationService = inject(OvaCreationService);
  private jobsApi = inject(OvaJobsApiService);
  private syncRunner: OvaJobSyncRunner;
  private jobIdState = signal<string | null>(null);
  private selectionsState = signal<Selections>(EMPTY_SELECTIONS);
  private startingState = signal(false);
  private errorState = signal("");
  private selectedFailedIdsState = signal<string[]>([]);
  private jobSnapshot = signal<JobSnapshot | null>(null);
  private streamingState = signal(false);
  private resumingState = signal(false);
  private lastFingerprint = "";
  private lastProgressAtState = signal<number>(Date.now());
  jobId = this.jobIdState.asReadonly();
  job = this.jobSnapshot.asReadonly();
  error = this.errorState.asReadonly();
  selections = this.selectionsState.asReadonly();
  starting = this.startingState.asReadonly();
  resuming = this.resumingState.asReadonly();
  viewModel = computed(() =>
    toResourceViewModel(this.jobSnapshot()?.resources || [], this.selectionsState()),
  );
  outcome = computed(() => jobOutcome(this.jobSnapshot(), this.viewModel()));
  selectedFailedIds = computed(() =>
    pruneSelection(this.selectedFailedIdsState(), this.viewModel()),
  );
  isStalled = computed(() => {
    const snapshot = this.jobSnapshot();
    if (snapshot?.status !== "running") return false;
    return Date.now() - this.lastProgressAtState() > STALL_MS;
  });
  phase = computed(() => {
    if (this.startingState()) return "starting";
    if (this.jobIdState() && this.jobSnapshot() && this.outcome().isTerminal) return "terminal";
    if (this.jobIdState()) return "polling";
    return "idle";
  });

  constructor() {
    this.syncRunner = new OvaJobSyncRunner({
      jobsApi: this.jobsApi,
      onSnapshot: (snapshot) => {
        const fingerprint = resourcesFingerprint(snapshot);
        if (fingerprint !== this.lastFingerprint) {
          this.lastFingerprint = fingerprint;
          this.lastProgressAtState.set(Date.now());
        }
        this.jobSnapshot.set(snapshot);
      },
      onTerminal: () => {
        this.syncRunner.stop();
      },
      getViewModel: () => this.viewModel(),
      isStreaming: () => this.streamingState(),
      setStreaming: (value) => {
        this.streamingState.set(value);
      },
    });
  }

  /** Encola el job; devuelve ova_id placeholder para ir al workspace. */
  async start(args: StartJobArgs): Promise<string | null> {
    this.selectionsState.set(args.selections);
    this.errorState.set("");
    this.selectedFailedIdsState.set([]);
    this.startingState.set(true);
    this.jobIdState.set(null);
    this.resetStallTracking();
    this.syncRunner.stop();
    try {
      const ack = await this.creationService.startJob({
        prompt: args.prompt,
        uploadIds: args.uploadIds,
        resources: toResourcesPayload(args.selections),
        theme: args.theme,
        resourceConfigs: args.resourceConfigs,
      });
      this.jobIdState.set(ack.job_id);
      return ack.ova_id ?? null;
    } catch (err: any) {
      this.errorState.set(err.message || "No se pudo iniciar la generación.");
      return null;
    } finally {
      this.startingState.set(false);
    }
  }

  reset() {
    this.syncRunner.stop();
    this.jobIdState.set(null);
    this.selectionsState.set(EMPTY_SELECTIONS);
    this.errorState.set("");
    this.selectedFailedIdsState.set([]);
    this.startingState.set(false);
    this.jobSnapshot.set(null);
    this.resetStallTracking();
  }

  restore(existingJobId: string) {
    this.errorState.set("");
    this.selectedFailedIdsState.set([]);
    this.jobIdState.set(existingJobId);
    this.resetStallTracking();
    this.startSyncFlow();
  }

  async resumeAndPoll(ids: string[]) {
    const id = this.jobIdState();
    if (!id) return;
    this.errorState.set("");
    this.resumingState.set(true);
    try {
      await this.jobsApi.resumeJob(id, ids);
      this.syncRunner.pollNow(id);
    } catch (err: any) {
      this.errorState.set(err.message || "No se pudo reintentar la generación.");
    } finally {
      this.resumingState.set(false);
    }
  }

  retryOne(id: string) {
    return this.resumeAndPoll([id]);
  }
  retrySelected() {
    return this.resumeAndPoll(this.selectedFailedIds());
  }
  retryAll() {
    return this.resumeAndPoll([]);
  }

  toggleFailed(resourceId: string) {
    const curr = this.selectedFailedIdsState();
    this.selectedFailedIdsState.set(
      curr.includes(resourceId) ? curr.filter((x) => x !== resourceId) : [...curr, resourceId],
    );
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
      await this.jobsApi.cancelJob(id);
      this.syncRunner.pollNow(id);
    } catch (err: any) {
      this.errorState.set(err.message || "No se pudo cancelar la generación.");
    }
  }

  ngOnDestroy() {
    this.reset();
  }

  private resetStallTracking() {
    this.lastFingerprint = "";
    this.lastProgressAtState.set(Date.now());
  }

  private startSyncFlow() {
    const id = this.jobIdState();
    if (!this.outcome().isTerminal && id) this.syncRunner.start(id);
  }
}

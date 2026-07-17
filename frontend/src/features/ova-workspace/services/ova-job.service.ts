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

const ALL_PHASES = ["engage", "explore", "explain", "elaborate", "evaluate"];
const EMPTY_SELECTIONS = Object.fromEntries(ALL_PHASES.map((p) => [p, []])) as Selections;

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
  // WS-02/CR-01: huella del último snapshot con progreso real (no solo el
  // último poll — un job `running` sin worker sigue devolviendo el mismo
  // snapshot en cada tick).
  private lastFingerprint = "";
  private lastProgressAtState = signal<number>(Date.now());

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

  /** Aviso no-destructivo (no cancela ni reintenta nada por su cuenta). */
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

  async start(args: StartJobArgs) {
    this.selectionsState.set(args.selections);
    this.errorState.set("");
    this.selectedFailedIdsState.set([]);
    this.startingState.set(true);
    this.jobIdState.set(null);
    this.resetStallTracking();
    this.syncRunner.stop();

    try {
      const { job_id } = await this.creationService.startJob({
        prompt: args.prompt,
        uploadIds: args.uploadIds,
        resources: toResourcesPayload(args.selections),
        theme: args.theme,
        resourceConfigs: args.resourceConfigs,
      });
      this.jobIdState.set(job_id);
      this.startSyncFlow();
    } catch (err: any) {
      this.errorState.set(err.message || "No se pudo iniciar la generación.");
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

  private resetStallTracking() {
    this.lastFingerprint = "";
    this.lastProgressAtState.set(Date.now());
  }

  async resumeAndPoll(ids: string[]) {
    const id = this.jobIdState();
    if (!id) return;
    this.errorState.set("");
    try {
      await this.jobsApi.resumeJob(id, ids);
      this.syncRunner.pollNow(id);
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
      await this.jobsApi.cancelJob(id);
      this.syncRunner.pollNow(id);
    } catch (err: any) {
      this.errorState.set(err.message || "No se pudo cancelar la generación.");
    }
  }

  ngOnDestroy() {
    this.reset();
  }

  private startSyncFlow() {
    if (this.outcome().isTerminal) return;
    const id = this.jobIdState();
    if (!id) return;
    this.syncRunner.start(id);
  }
}

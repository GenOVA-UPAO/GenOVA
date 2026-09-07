import {
  ChangeDetectionStrategy,
  Component,
  effect,
  inject,
  input,
  type OnInit,
  output,
  signal,
} from "@angular/core";

import { OvaJobsApiService } from "@/core/services/ova-jobs-api.service";

import { isResumableJob } from "../../lib/ova-job-view-model";
import { OvaJobService } from "../../services/ova-job.service";
import { CrearOvaPreviewPanelComponent } from "../creation/crear-ova-preview-panel.component";
import { ProgressPanelComponent } from "../creation/progress-panel.component";
import { TotalFailurePanelComponent } from "../creation/total-failure-panel.component";

/**
 * Progreso de generación inicial dentro del workspace (no en /crear).
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-generating-panel",
  imports: [ProgressPanelComponent, CrearOvaPreviewPanelComponent, TotalFailurePanelComponent],
  host: { class: "flex min-h-0 flex-1 flex-col" },
  template: `
    <div class="flex flex-1 min-h-0 overflow-hidden">
      <div
        class="w-full sm:w-[380px] lg:w-[420px] sm:shrink-0 border-r border-border/50 flex flex-col overflow-hidden bg-card/30"
      >
        <div class="flex-1 overflow-y-auto p-4 space-y-3">
          @if (loadError()) {
            <p class="text-sm text-destructive">{{ loadError() }}</p>
          }
          @if (!loadError() && isGenerating && job.viewModel().length === 0) {
            <p role="status" class="text-sm text-muted-foreground">Iniciando generación…</p>
          }
          @if (job.viewModel().length > 0) {
            <gn-progress-panel
              [job]="job.job()"
              [viewModel]="job.viewModel()"
              [selectedIds]="job.selectedFailedIds()"
              [activeId]="activeId()"
              (onToggle)="job.toggleFailed($event)"
              (onRetryOne)="job.retryOne($event)"
              (onPreview)="pinnedId.set($event)"
              (onSelectAll)="job.selectAllFailed()"
              (onRetrySelected)="job.retrySelected()"
              [showCancel]="isGenerating"
              (onCancel)="job.cancel()"
              [isStalled]="job.isStalled()"
              [resumableCount]="resumableCount()"
              [resuming]="job.resuming()"
              (onResume)="job.retryAll()"
            ></gn-progress-panel>
          }
          @if (isTerminal && job.outcome().totalFail) {
            <gn-total-failure-panel
              [viewModel]="job.viewModel()"
              (onRetryAll)="job.retryAll()"
            ></gn-total-failure-panel>
          }
          @if (job.error()) {
            <p class="text-xs text-destructive">{{ job.error() }}</p>
          }
        </div>
      </div>
      <div class="hidden sm:flex flex-col flex-1 min-h-0 overflow-hidden bg-muted/10">
        <gn-crear-ova-preview-panel
          [jobId]="job.jobId()"
          [viewModel]="job.viewModel()"
          [pinnedId]="pinnedId()"
          (onPin)="pinnedId.set($event)"
        ></gn-crear-ova-preview-panel>
      </div>
    </div>
  `,
})
export class OvaGeneratingPanelComponent implements OnInit {
  readonly ovaId = input.required<string>();
  readonly onReady = output();

  job = inject(OvaJobService);
  private jobsApi = inject(OvaJobsApiService);

  readonly pinnedId = signal<string | null>(null);
  readonly loadError = signal("");

  private readyEmitted = false;

  constructor() {
    effect(() => {
      const terminal = this.job.phase() === "terminal";
      const outcome = this.job.outcome();
      if (terminal && outcome.anyDone && !outcome.totalFail && !this.readyEmitted) {
        this.readyEmitted = true;
        void this.finishReady();
      }
    });
  }

  /** Reconsulta el job (repara OVA atascado en generando) y abre el editor. */
  private async finishReady() {
    try {
      await this.jobsApi.getJobByOvaId(this.ovaId());
    } catch {
      /* el load del workspace reintentará si sigue en generando */
    }
    this.onReady.emit();
  }

  ngOnInit() {
    void this.bindJob();
  }

  get isGenerating() {
    return this.job.phase() === "starting" || this.job.phase() === "polling";
  }

  get isTerminal() {
    return this.job.phase() === "terminal";
  }

  /** Pendientes + fallidos: lo que el backend reintentará al reanudar. 0 = no reanudable. */
  resumableCount(): number {
    const snapshot = this.job.job();
    if (!isResumableJob(snapshot, snapshot?.resources || [])) return 0;
    return this.job.viewModel().filter((r) => r.status === "pendiente" || r.status === "X").length;
  }

  activeId() {
    const vm = this.job.viewModel();
    const pinned = this.pinnedId();
    const pinnedDone = vm.some((r) => r.id === pinned && r.status === "check");
    if (pinnedDone) return pinned;
    return vm.find((r) => r.status === "check")?.id ?? null;
  }

  private async bindJob() {
    this.loadError.set("");
    try {
      const data = (await this.jobsApi.getJobByOvaId(this.ovaId())) as {
        job_id?: string;
      };
      if (!data?.job_id) {
        this.loadError.set("No se encontró la generación de este OVA.");
        return;
      }
      this.job.restore(data.job_id);
    } catch {
      this.loadError.set("No se pudo cargar el progreso de generación.");
    }
  }
}

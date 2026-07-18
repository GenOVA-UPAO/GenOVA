import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  type OnInit,
  output,
  signal,
} from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";

import { buildUploadsProps } from "../../lib/upload-chip-view-model";
import { CrearOvaTourService } from "../../services/crear-ova-tour.service";
import { OvaCreationFlowService } from "../../services/ova-creation-flow.service";
import { OvaJobService } from "../../services/ova-job.service";
import { OvaUploadsService } from "../../services/ova-uploads.service";
import { PhaseSelectModalComponent } from "../modals/phase-select-modal.component";
import { CrearOvaPreviewPanelComponent } from "./crear-ova-preview-panel.component";
import { OvaCreateFormCardComponent } from "./ova-create-form-card.component";
import { ProgressPanelComponent } from "./progress-panel.component";
import { TotalFailurePanelComponent } from "./total-failure-panel.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-creation-view",
  imports: [
    ButtonComponent,
    OvaCreateFormCardComponent,
    PhaseSelectModalComponent,
    ProgressPanelComponent,
    CrearOvaPreviewPanelComponent,
    TotalFailurePanelComponent,
  ],
  // host flex: mismo fix de cadena de alturas que gn-ova-edit-view (ver
  // ese componente para el diagnóstico completo).
  host: { class: "flex min-h-0 flex-1 flex-col" },
  template: `
    @if (!hasJob) {
      <gn-ova-create-form-card
        [prompt]="flow.prompt()"
        (promptChange)="flow.setPrompt($event)"
        [minChars]="flow.minChars"
        [canGenerate]="flow.canGenerate()"
        (openModal)="flow.openModal()"
        [selections]="flow.selections()"
        [totalResources]="flow.totalResources()"
        [phasesWithResources]="flow.phasesWithResources()"
        [theme]="flow.theme()"
        (themeChange)="flow.setTheme($event)"
        (generate)="flow.generate()"
        [error]="job.error()"
        [uploadsProps]="uploadsProps()"
        (replayTour)="tour.restart()"
        (closePicker)="flow.closeModal()"
      ></gn-ova-create-form-card>
      @if (flow.isModalOpen()) {
        <gn-phase-select-modal
          [initialSelections]="flow.selections()"
          [initialResourceConfigs]="flow.resourceConfigs()"
          (onClose)="flow.closeModal()"
          (onConfirm)="flow.confirmSelections($event.picks, $event.configs)"
        ></gn-phase-select-modal>
      }
    } @else {
      <div class="flex flex-col flex-1 min-h-0 bg-background text-foreground">
        <div class="flex flex-1 min-h-0 overflow-hidden">
          <div
            class="w-full sm:w-[380px] lg:w-[420px] sm:shrink-0 border-r border-border/50 flex flex-col overflow-hidden bg-card/30"
          >
            <div class="flex-1 overflow-y-auto p-4 space-y-3">
              @if (isGenerating && job.viewModel().length === 0) {
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
                  (onPreview)="setPinned($event)"
                  (onSelectAll)="job.selectAllFailed()"
                  (onRetrySelected)="job.retrySelected()"
                  [showCancel]="isGenerating"
                  (onCancel)="job.cancel()"
                  [isStalled]="job.isStalled()"
                  (onResume)="job.retryAll()"
                ></gn-progress-panel>
              }
              @if (isTerminal && job.outcome().totalFail) {
                <gn-total-failure-panel
                  [viewModel]="job.viewModel()"
                  (onRetryAll)="flow.reset()"
                ></gn-total-failure-panel>
              }
              @if (isTerminal && !job.outcome().totalFail) {
                <gn-button variant="link" size="sm" (onClick)="flow.reset()">
                  ← Crear otro OVA
                </gn-button>
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
              (onPin)="setPinned($event)"
            ></gn-crear-ova-preview-panel>
          </div>
        </div>
      </div>
    }
  `,
})
export class OvaCreationViewComponent implements OnInit {
  flow = inject(OvaCreationFlowService);
  job = inject(OvaJobService);
  uploadsSvc = inject(OvaUploadsService);
  tour = inject(CrearOvaTourService);

  readonly initialJobId = input<string | undefined>(undefined);
  readonly onCreated = output<string>();

  pinnedId = signal<string | null>(null);

  constructor() {
    effect(() => {
      const terminal = this.job.phase() === "terminal";
      const outcome = this.job.outcome();
      const ovaId = (this.job.job() as { ova_id?: string | null } | null)?.ova_id;
      if (terminal && outcome.anyDone && ovaId) this.onCreated.emit(ovaId);
    });

    // Mis OVAs → «Reanudar / Ver progreso» llega con ?jobId=. El servicio de
    // job es singleton: hay que restaurar aunque hubiera otro job en memoria.
    effect(() => {
      const id = this.initialJobId();
      if (!id || this.job.jobId() === id) return;
      this.flow.restore(id);
    });
  }

  ngOnInit() {
    if (!this.hasJob) this.tour.startIfNeeded();
  }

  get hasJob() {
    return this.job.phase() !== "idle";
  }

  get isGenerating() {
    return this.job.phase() === "starting" || this.job.phase() === "polling";
  }

  get isTerminal() {
    return this.job.phase() === "terminal";
  }

  activeId() {
    const vm = this.job.viewModel();
    const pinned = this.pinnedId();
    const pinnedDone = vm.some((r) => r.id === pinned && r.status === "check");
    if (pinnedDone) return pinned;
    return vm.find((r) => r.status === "check")?.id ?? null;
  }

  setPinned(id: string | null) {
    this.pinnedId.set(id);
  }

  // computed: el getter devolvía un prop-bag nuevo por ciclo de CD hacia el
  // form-card OnPush.
  readonly uploadsProps = computed(() => buildUploadsProps(this.uploadsSvc));
}

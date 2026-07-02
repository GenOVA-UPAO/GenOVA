import { Component, type OnInit, effect, inject, signal, input, output } from "@angular/core";
import { ButtonComponent } from "@/core/components/ui/button.component";
import { PhaseSelectModalComponent } from "../modals/phase-select-modal.component";
import { OvaCreationFlowService } from "../../services/ova-creation-flow.service";
import { OvaJobService } from "../../services/ova-job.service";
import { OvaUploadsService } from "../../services/ova-uploads.service";
import { buildUploadsProps } from "../../lib/upload-chip-view-model";
import { CrearOvaPreviewPanelComponent } from "./crear-ova-preview-panel.component";
import { OvaCreateFormCardComponent } from "./ova-create-form-card.component";
import { ProgressPanelComponent } from "./progress-panel.component";
import { TotalFailurePanelComponent } from "./total-failure-panel.component";

@Component({
  selector: "gn-ova-creation-view",
  standalone: true,
  imports: [
    ButtonComponent,
    OvaCreateFormCardComponent,
    PhaseSelectModalComponent,
    ProgressPanelComponent,
    CrearOvaPreviewPanelComponent,
    TotalFailurePanelComponent,
  ],
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
        [theme]="flow.theme()"
        (themeChange)="flow.setTheme($event)"
        (generate)="flow.generate()"
        [error]="job.error()"
        [uploadsProps]="uploadsProps"
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
  }

  ngOnInit() {
    const initialJobId = this.initialJobId();
    if (initialJobId && this.job.phase() === "idle") {
      this.flow.restore(initialJobId);
    }
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

  get uploadsProps() {
    return buildUploadsProps(this.uploadsSvc);
  }
}

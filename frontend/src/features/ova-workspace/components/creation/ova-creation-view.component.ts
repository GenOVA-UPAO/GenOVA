import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  type OnInit,
  output,
} from "@angular/core";

import { buildUploadsProps } from "../../lib/upload-chip-view-model";
import { CrearOvaTourService } from "../../services/crear-ova-tour.service";
import { OvaCreationFlowService } from "../../services/ova-creation-flow.service";
import { OvaJobService } from "../../services/ova-job.service";
import { OvaUploadsService } from "../../services/ova-uploads.service";
import { PhaseSelectModalComponent } from "../modals/phase-select-modal.component";
import { OvaCreateFormCardComponent } from "./ova-create-form-card.component";

/**
 * Solo el formulario de creación. Al pulsar Generar se emite `onStarted` con el
 * ova_id y el progreso vive en el workspace — no en /crear.
 */
@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-creation-view",
  imports: [OvaCreateFormCardComponent, PhaseSelectModalComponent],
  host: { class: "flex min-h-0 flex-1 flex-col" },
  template: `
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
      (generate)="onGenerate()"
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
  `,
})
export class OvaCreationViewComponent implements OnInit {
  flow = inject(OvaCreationFlowService);
  job = inject(OvaJobService);
  uploadsSvc = inject(OvaUploadsService);
  tour = inject(CrearOvaTourService);

  /** Emitido en cuanto el job está encolado (placeholder OVA ya existe). */
  readonly onStarted = output<string>();

  readonly uploadsProps = computed(() => buildUploadsProps(this.uploadsSvc));

  ngOnInit() {
    // /crear siempre arranca limpio: el progreso pertenece al workspace.
    this.flow.reset();
    this.tour.startIfNeeded();
  }

  async onGenerate() {
    const ovaId = await this.flow.generate();
    // No reset aquí: el job (y selecciones) siguen vivos para el panel del workspace.
    if (ovaId) this.onStarted.emit(ovaId);
  }
}

import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import { ButtonComponent } from "@/core/components/ui/button.component";

// Stub for PhaseSelectModal until Phase 4 (Workspace) and Phase 5 (Admin/Student) types are available.
@Component({
  selector: "gn-phase-select-modal",
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonComponent],
  template: `
    <p-dialog 
      [visible]="true" 
      [modal]="true" 
      [closable]="true"
      (onHide)="onClose.emit()"
      [style]="{width: '60rem', 'max-width': '100%'}"
      header="Selección de Recursos (Fases 5E)"
      contentStyleClass="p-6 bg-card"
    >
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          [Stub] Este componente será implementado completamente en la Fase 4, ya que requiere las entidades Resource del módulo Student.
        </p>
        <div class="flex justify-end pt-4">
          <gn-button (onClick)="onClose.emit()">Cerrar</gn-button>
        </div>
      </div>
    </p-dialog>
  `,
})
export class PhaseSelectModalComponent {
  @Input() initialSelections?: any;
  @Input() initialResourceConfigs?: any;

  @Output() onClose = new EventEmitter<void>();
  @Output() onConfirm = new EventEmitter<{ picks: any; configs: any }>();
}

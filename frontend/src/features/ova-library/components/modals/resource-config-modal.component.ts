import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import { ButtonComponent } from "@/core/components/ui/button.component";

// Stub for ResourceConfigModal until Phase 4 (Workspace) and Phase 5 (Admin/Student) types are available.
@Component({
  selector: "gn-resource-config-modal",
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonComponent],
  template: `
    <p-dialog 
      [visible]="true" 
      [modal]="true" 
      [closable]="true"
      (onHide)="onClose.emit()"
      [style]="{width: '40rem', 'max-width': '100%'}"
      header="Configurar Recurso"
      contentStyleClass="p-6 bg-card"
    >
      <div class="space-y-4">
        <p class="text-sm text-muted-foreground">
          [Stub] Este componente será implementado completamente en la Fase 4.
        </p>
        <div class="flex justify-end pt-4">
          <gn-button (onClick)="onClose.emit()">Cerrar</gn-button>
        </div>
      </div>
    </p-dialog>
  `,
})
export class ResourceConfigModalComponent {
  @Input() resource: any;
  @Input() phaseKey!: string;
  @Input() phaseColor!: string;
  @Input() config: any;
  @Input() videoKeyConfigured = true;

  @Output() onClose = new EventEmitter<void>();
  @Output() onSave = new EventEmitter<{ phaseKey: string; resource: any; config: any }>();
}

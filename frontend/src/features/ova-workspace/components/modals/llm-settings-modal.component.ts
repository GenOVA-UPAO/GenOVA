import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { ButtonComponent } from "@/core/components/ui/button.component";
import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogFooterComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from "@/core/components/ui/dialog.component";

@Component({
  selector: "gn-llm-settings-modal",
  standalone: true,
  imports: [
    CommonModule,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogFooterComponent,
    DialogTitleComponent,
    DialogDescriptionComponent,
    ButtonComponent,
  ],
  template: `
    <gn-dialog [open]="open" (openChange)="onOpenChange.emit($event)">
      <gn-dialog-content class="max-w-lg">
        <gn-dialog-header>
          <gn-dialog-title>Configuración de IA</gn-dialog-title>
          <gn-dialog-description>
            (Stub: la implementación completa estará en la Fase 5).
          </gn-dialog-description>
        </gn-dialog-header>

        <div class="py-4 text-sm text-muted-foreground text-center">
          La configuración de modelos se cargará aquí.
        </div>

        <gn-dialog-footer>
          <gn-button
            variant="ghost"
            (click)="onOpenChange.emit(false)"
          >
            Cerrar
          </gn-button>
        </gn-dialog-footer>
      </gn-dialog-content>
    </gn-dialog>
  `,
})
export class LlmSettingsModalComponent {
  @Input() open = false;
  @Output() onOpenChange = new EventEmitter<boolean>();
}

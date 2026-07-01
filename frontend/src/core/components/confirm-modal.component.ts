import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import { ButtonComponent } from "@/core/components/ui/button.component";

@Component({
  selector: "gn-confirm-modal",
  standalone: true,
  imports: [CommonModule, DialogModule, ButtonComponent],
  template: `
    <p-dialog 
      [visible]="true" 
      [modal]="true" 
      [closable]="!isLoading"
      (onHide)="onCancel.emit()"
      [style]="{width: '24rem', 'max-width': '100%'}"
      [showHeader]="false"
      contentStyleClass="p-0 bg-card rounded-xl border border-border shadow-lg"
    >
      <div class="p-6">
        <h2 class="text-lg font-semibold tracking-tight">{{ title }}</h2>
        <p class="text-sm text-muted-foreground whitespace-pre-line mt-2">
          {{ message }}
        </p>
        <div class="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-6">
          <gn-button 
            variant="outline" 
            class="flex-1 block" 
            (onClick)="onCancel.emit()" 
            [disabled]="isLoading"
          >
            Cancelar
          </gn-button>
          <gn-button 
            [variant]="danger ? 'destructive' : 'default'" 
            class="flex-1 block" 
            (onClick)="onConfirm.emit()" 
            [disabled]="isLoading"
            [loading]="isLoading"
          >
            {{ isLoading ? 'Procesando...' : confirmLabel }}
          </gn-button>
        </div>
      </div>
    </p-dialog>
  `,
})
export class ConfirmModalComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) message!: string;
  @Input({ required: true }) confirmLabel!: string;
  @Input() isLoading = false;
  @Input() danger = true;

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
}

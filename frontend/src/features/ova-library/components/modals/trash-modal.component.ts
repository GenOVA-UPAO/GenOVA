import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import { ButtonComponent } from "@/core/components/ui/button.component";
import type { OvaListItem } from "@/features/ova-library/lib/types";

@Component({
  selector: "gn-trash-modal",
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
        <h2 class="text-lg font-semibold tracking-tight">Mover a la papelera</h2>
        <div class="mt-4 space-y-1">
          <p class="text-sm text-muted-foreground">
            ¿Mover a la papelera 
            <span class="font-semibold text-foreground">"{{ ova.title }}"</span>?
          </p>
          <p class="text-xs text-muted-foreground/70">
            Podrás restaurarlo desde la sección Papelera.
          </p>
        </div>
        <div class="flex gap-3 pt-6">
          <gn-button 
            variant="outline" 
            class="flex-1 block" 
            (onClick)="onCancel.emit()" 
            [disabled]="isLoading"
          >
            Cancelar
          </gn-button>
          <gn-button 
            variant="destructive" 
            class="flex-1 block" 
            (onClick)="onConfirm.emit()" 
            [disabled]="isLoading"
            [loading]="isLoading"
          >
            {{ isLoading ? 'Moviendo...' : 'Mover' }}
          </gn-button>
        </div>
      </div>
    </p-dialog>
  `,
})
export class TrashModalComponent {
  @Input({ required: true }) ova!: OvaListItem;
  @Input() isLoading = false;

  @Output() onConfirm = new EventEmitter<void>();
  @Output() onCancel = new EventEmitter<void>();
}

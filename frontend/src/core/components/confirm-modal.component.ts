import { Component, input, output } from "@angular/core";
import { DialogModule } from "primeng/dialog";
import { ButtonComponent } from "@/core/components/ui/button.component";

@Component({
  selector: "gn-confirm-modal",
  standalone: true,
  imports: [DialogModule, ButtonComponent],
  template: `
    <p-dialog
      [visible]="true"
      [modal]="true"
      [closable]="!isLoading()"
      (onHide)="onCancel.emit()"
      [style]="{ width: '24rem', 'max-width': '100%' }"
      [showHeader]="false"
      contentStyleClass="p-0 bg-card rounded-xl border border-border shadow-lg"
    >
      <div class="p-6">
        <h2 class="text-lg font-semibold tracking-tight">{{ title() }}</h2>
        <p class="text-sm text-muted-foreground whitespace-pre-line mt-2">
          {{ message() }}
        </p>
        <div class="flex flex-col-reverse sm:flex-row gap-2 sm:gap-3 pt-6">
          <gn-button
            variant="outline"
            class="flex-1 block"
            (onClick)="onCancel.emit()"
            [disabled]="isLoading()"
          >
            Cancelar
          </gn-button>
          <gn-button
            [variant]="danger() ? 'destructive' : 'default'"
            class="flex-1 block"
            (onClick)="onConfirm.emit()"
            [disabled]="isLoading()"
            [loading]="isLoading()"
          >
            {{ isLoading() ? 'Procesando...' : confirmLabel() }}
          </gn-button>
        </div>
      </div>
    </p-dialog>
  `,
})
export class ConfirmModalComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly isLoading = input(false);
  readonly danger = input(true);

  readonly onConfirm = output<void>();
  readonly onCancel = output<void>();
}

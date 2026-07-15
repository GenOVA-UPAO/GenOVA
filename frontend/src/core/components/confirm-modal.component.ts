import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";
import { DialogComponent } from "@/core/components/ui/dialog.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-confirm-modal",
  imports: [DialogComponent, ButtonComponent],
  template: `
    <gn-dialog
      [open]="true"
      width="24rem"
      [disableClose]="isLoading()"
      (openChange)="$event || onCancel.emit()"
    >
      <div class="p-6 bg-card">
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
            {{ isLoading() ? "Procesando..." : confirmLabel() }}
          </gn-button>
        </div>
      </div>
    </gn-dialog>
  `,
})
export class ConfirmModalComponent {
  readonly title = input.required<string>();
  readonly message = input.required<string>();
  readonly confirmLabel = input.required<string>();
  readonly isLoading = input(false);
  readonly danger = input(true);

  readonly onConfirm = output();
  readonly onCancel = output();
}

import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";
import { DialogComponent } from "@/core/components/ui/dialog.component";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-bulk-trash-modal",
  imports: [DialogComponent, ButtonComponent],
  template: `
    <gn-dialog
      [open]="true"
      width="24rem"
      [disableClose]="isLoading()"
      (openChange)="$event || onCancel.emit()"
    >
      <div class="p-6 bg-card">
        <h2 class="text-lg font-semibold tracking-tight">Mover a la papelera</h2>
        <div class="mt-4 space-y-1">
          <p class="text-sm text-muted-foreground">
            ¿Mover
            <span class="font-semibold text-foreground">{{ count() }} OVAs</span>
            a la papelera?
          </p>
          <p class="text-xs text-muted-foreground/70">
            Podrás restaurarlos desde la sección Papelera.
          </p>
        </div>
        <div class="flex gap-3 pt-6">
          <gn-button
            variant="outline"
            class="flex-1 block"
            (onClick)="onCancel.emit()"
            [disabled]="isLoading()"
          >
            Cancelar
          </gn-button>
          <gn-button
            variant="destructive"
            class="flex-1 block"
            (onClick)="onConfirm.emit()"
            [disabled]="isLoading()"
            [loading]="isLoading()"
          >
            {{ isLoading() ? "Moviendo..." : "Mover " + count() }}
          </gn-button>
        </div>
      </div>
    </gn-dialog>
  `,
})
export class BulkTrashModalComponent {
  readonly count = input.required<number>();
  readonly isLoading = input(false);

  readonly onConfirm = output();
  readonly onCancel = output();
}

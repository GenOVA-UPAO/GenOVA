import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";
import { DialogComponent } from "@/core/components/ui/dialog.component";
import type { OvaListItem } from "@/features/ova-library/lib/types";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-trash-modal",
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
            ¿Mover a la papelera
            <span class="font-semibold text-foreground">"{{ ova().title }}"</span>?
          </p>
          <p class="text-xs text-muted-foreground/70">
            Podrás restaurarlo desde la sección Papelera.
          </p>
        </div>
        <div class="flex gap-3 pt-6">
          <gn-button
            variant="outline"
            class="flex-1"
            (onClick)="onCancel.emit()"
            [disabled]="isLoading()"
          >
            Cancelar
          </gn-button>
          <gn-button
            variant="destructive"
            class="flex-1"
            (onClick)="onConfirm.emit()"
            [disabled]="isLoading()"
            [loading]="isLoading()"
          >
            {{ isLoading() ? "Moviendo..." : "Mover" }}
          </gn-button>
        </div>
      </div>
    </gn-dialog>
  `,
})
export class TrashModalComponent {
  readonly ova = input.required<OvaListItem>();
  readonly isLoading = input(false);

  readonly onConfirm = output();
  readonly onCancel = output();
}

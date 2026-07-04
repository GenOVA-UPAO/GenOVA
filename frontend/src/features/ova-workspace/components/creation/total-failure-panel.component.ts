import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";

import type { ResourceVM } from "../../lib/ova-job-view-model";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-total-failure-panel",
  imports: [ButtonComponent],
  template: `
    <div class="space-y-3">
      <div class="rounded-lg border border-destructive/50 bg-destructive/10 p-4">
        <p class="font-semibold text-destructive">No se pudo generar el OVA</p>
        <p class="mt-1 text-sm text-muted-foreground">
          Lo sentimos, hubo un error generando los recursos. Ningún recurso se completó, por lo que
          no se guardó ningún OVA.
          @if (errorId) {
            <span class="mt-1 block text-xs">
              Error ID: <span class="font-mono">{{ errorId }}</span>
            </span>
          }
        </p>
      </div>
      <gn-button variant="destructive" (onClick)="onRetryAll.emit()">
        Reintentar generación
      </gn-button>
    </div>
  `,
})
export class TotalFailurePanelComponent {
  readonly viewModel = input<ResourceVM[]>([]);
  readonly onRetryAll = output();

  get errorId() {
    return this.viewModel().find((r) => r.error_id)?.error_id;
  }
}

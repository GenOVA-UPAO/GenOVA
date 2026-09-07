import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";

import {
  AlertComponent,
  AlertDescriptionComponent,
  AlertTitleComponent,
} from "@/core/components/ui/alert.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { joinList } from "../lib/join-list";
import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-catalog-status-alert",
  imports: [AlertComponent, AlertTitleComponent, AlertDescriptionComponent, ButtonComponent],
  template: `
    @if (downProviders().length > 0) {
      <gn-alert class="border-accent-brand/40 bg-accent-brand/5 grid gap-2 rounded-lg border p-4">
        <gn-alert-title class="font-semibold text-sm">
          No pudimos obtener los modelos de {{ providerNames() }}
        </gn-alert-title>
        <gn-alert-description class="text-sm text-muted-foreground">
          Se muestran los últimos datos disponibles.
        </gn-alert-description>
        <div class="mt-2">
          <gn-button size="sm" variant="outline" (onClick)="retry.emit()" [disabled]="refreshing()">
            <span [class.animate-spin]="refreshing()">↻</span>
            {{ refreshing() ? "Reintentando…" : "Reintentar" }}
          </gn-button>
        </div>
      </gn-alert>
    }
  `,
})
export class CatalogStatusAlertComponent {
  readonly catalogStatus = input<Record<
    string,
    {
      ok: boolean;
      last_success_at?: string;
    }
  > | null>(null);
  readonly refreshing = input(false);
  readonly retry = output();

  readonly downProviders = computed<[string, { ok: boolean; last_success_at?: string }][]>(() =>
    Object.entries(this.catalogStatus() || {}).filter(([, st]) => st && !st.ok),
  );

  readonly providerNames = computed(() =>
    joinList(this.downProviders().map(([p]) => PROVIDER_LABELS[p] || p)),
  );
}

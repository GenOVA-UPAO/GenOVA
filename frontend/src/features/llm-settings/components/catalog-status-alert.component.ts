import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";

import { AlertComponent, AlertTitleComponent } from "@/core/components/ui/alert.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { joinList } from "../lib/join-list";
import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-catalog-status-alert",
  imports: [AlertComponent, AlertTitleComponent, ButtonComponent],
  template: `
    @if (downProviders().length > 0) {
      <gn-alert class="border-accent-brand/40 bg-accent-brand/5 rounded-lg border">
        <div class="flex flex-wrap items-center gap-x-3 gap-y-1 px-1 py-0.5">
          <gn-alert-title class="m-0 min-w-0 flex-1 font-semibold text-sm">
            No pudimos obtener los modelos de {{ providerNames() }}
          </gn-alert-title>
          <gn-button
            size="sm"
            variant="outline"
            class="shrink-0"
            (onClick)="retry.emit()"
            [disabled]="refreshing()"
          >
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

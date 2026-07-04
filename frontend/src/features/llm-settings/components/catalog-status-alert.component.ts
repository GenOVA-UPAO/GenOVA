import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import {
  AlertComponent,
  AlertDescriptionComponent,
  AlertTitleComponent,
} from "@/core/components/ui/alert.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { PROVIDER_LABELS } from "../lib/llm-catalog.utils";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-catalog-status-alert",
  imports: [AlertComponent, AlertTitleComponent, AlertDescriptionComponent, ButtonComponent],
  template: `
    @if (downProviders.length > 0) {
      <gn-alert class="border-accent-brand/40 bg-accent-brand/5 grid gap-2 rounded-lg border p-4">
        <gn-alert-title class="font-semibold text-sm">
          No pudimos obtener los modelos de {{ providerNames }}
        </gn-alert-title>
        <gn-alert-description class="text-sm text-muted-foreground">
          Se muestran los últimos datos disponibles.
          @if (lastOk) {
            Última actualización: {{ lastOk }}.
          }
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

  get downProviders(): [string, { ok: boolean; last_success_at?: string }][] {
    return Object.entries(this.catalogStatus() || {}).filter(([, st]) => st && !st.ok);
  }

  get providerNames(): string {
    return this.downProviders.map(([p]) => PROVIDER_LABELS[p] || p).join(" y ");
  }

  get lastOk(): string | null {
    for (const [, st] of this.downProviders) {
      const formatted = formatTimestamp(st.last_success_at);
      if (formatted) return formatted;
    }
    return null;
  }
}

function formatTimestamp(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toLocaleString("es-PE", { dateStyle: "short", timeStyle: "short" });
}

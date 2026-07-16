import { ChangeDetectionStrategy, Component, computed, input } from "@angular/core";

import type { AnalyticsTotals } from "../lib/types";

const STATUS_META: Record<string, { label: string; color: string }> = {
  listo: { label: "Listos", color: "bg-emerald-500" },
  generando: { label: "Generando", color: "bg-amber-500" },
  borrador: { label: "Borradores", color: "bg-slate-400" },
  error: { label: "Con error", color: "bg-red-500" },
};

const STAT_ICON_CLASS: Record<string, string> = {
  stack: "ph-stack",
  users: "ph-users",
  "graduation-cap": "ph-graduation-cap",
  "chart-bar": "ph-chart-bar",
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-stat-card",
  imports: [],
  template: `
    <div class="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="flex items-center gap-3">
        <div
          class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary"
        >
          <i class="ph {{ iconClass() }} text-xl leading-none" aria-hidden="true"></i>
        </div>
        <div>
          <p class="text-2xl font-bold tabular-nums">{{ value() }}</p>
          <p class="text-xs font-medium text-muted-foreground">{{ label() }}</p>
        </div>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  readonly icon = input.required<string>();
  readonly label = input.required<string>();
  readonly value = input.required<string | number>();

  readonly iconClass = computed(() => STAT_ICON_CLASS[this.icon()] ?? "ph-squares-four");
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-stat-cards",
  imports: [StatCardComponent],
  template: `
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <gn-stat-card icon="stack" label="OVAs totales" [value]="totals().ovas"></gn-stat-card>

      @if (scope() === "platform") {
        <gn-stat-card icon="users" label="Usuarios" [value]="totals().users || 0"></gn-stat-card>
      }
      @if (scope() !== "platform") {
        <gn-stat-card
          icon="graduation-cap"
          label="Alumnos vinculados"
          [value]="totals().students || 0"
        ></gn-stat-card>
      }

      <gn-stat-card
        icon="chart-bar"
        label="Alcance"
        [value]="scope() === 'platform' ? 'Global' : 'Cohorte'"
      ></gn-stat-card>
    </div>
  `,
})
export class StatCardsComponent {
  readonly totals = input.required<AnalyticsTotals>();
  readonly scope = input<string | undefined>(undefined);
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-status-breakdown",
  imports: [],
  template: `
    <div class="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 text-sm font-semibold">OVAs por estado</h2>
      <div class="space-y-3">
        @for (item of statusEntries(); track item.key) {
          <div>
            <div class="mb-1 flex items-center justify-between text-xs">
              <span class="font-medium text-foreground">
                {{ item.meta.label }}
              </span>
              <span class="tabular-nums text-muted-foreground">
                {{ item.n }} · {{ item.pct }}%
              </span>
            </div>
            <div
              class="h-2 w-full overflow-hidden rounded-full bg-muted"
              role="progressbar"
              [attr.aria-valuenow]="item.pct"
              aria-valuemin="0"
              aria-valuemax="100"
              [attr.aria-label]="item.meta.label + ': ' + item.pct + '%'"
            >
              <div class="h-full {{ item.meta.color }}" [style.width]="item.pct + '%'"></div>
            </div>
          </div>
        }
      </div>
    </div>
  `,
})
export class StatusBreakdownComponent {
  readonly byStatus = input.required<Record<string, number>>();

  // computed + track por clave estable: el getter devolvía un array nuevo por
  // ciclo de CD y `track item` (identidad) destruía/recreaba la lista entera.
  readonly total = computed(() => Object.values(this.byStatus()).reduce((a, b) => a + b, 0) || 1);

  readonly statusEntries = computed(() =>
    Object.entries(STATUS_META).map(([key, meta]) => {
      const n = this.byStatus()[key] || 0;
      const pct = Math.round((n / this.total()) * 100);
      return { key, meta, n, pct };
    }),
  );
}

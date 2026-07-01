import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import type { AnalyticsTotals } from "../lib/types";

const STATUS_META: Record<string, { label: string; color: string }> = {
  listo: { label: "Listos", color: "bg-emerald-500" },
  generando: { label: "Generando", color: "bg-amber-500" },
  borrador: { label: "Borradores", color: "bg-slate-400" },
  error: { label: "Con error", color: "bg-red-500" },
};

@Component({
  selector: "gn-stat-card",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <div class="flex items-center gap-3">
        <div class="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
          <ng-container [ngSwitch]="icon">
            <svg *ngSwitchCase="'stack'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M211.91,114.33l-79.93,42a16,16,0,0,1-15.05,0l-80-42a8,8,0,0,1,0-14.18l80-42a15.93,15.93,0,0,1,15.05,0l80,42A8,8,0,0,1,211.91,114.33Z" opacity="0.2"></path><path d="M219.43,101.46,140,59.39a24.1,24.1,0,0,0-22.56,0L38.08,101.46a16,16,0,0,0,0,28.27l79.35,42.06a24,24,0,0,0,22.56,0l79.35-42.06A16,16,0,0,0,219.43,101.46ZM128,157.34l-75.11-39.8L128,77.74l75.1,39.8ZM219.43,149.46l-20.73,11-66.5,35.24a24,24,0,0,1-22.56,0L43.14,160.46,22.41,149.46a8,8,0,0,0-7.53,14.13l80,42.41a24,24,0,0,0,22.56,0l80-42.41a8,8,0,1,0-7.53-14.13Z"></path></svg>
            <svg *ngSwitchCase="'users'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M216,216a64,64,0,0,0-43.2-60.59,48,48,0,1,0-89.6,0A64,64,0,0,0,40,216Z" opacity="0.2"></path><path d="M222.65,193.38a79.8,79.8,0,0,0-46.8-51.48,56,56,0,1,0-95.7,0A79.8,79.8,0,0,0,33.35,193.38a8,8,0,1,0,13.3,8.46,64,64,0,0,1,162.7,0,8,8,0,1,0,13.3-8.46ZM128,136a40,40,0,1,1,40-40A40,40,0,0,1,128,136Z"></path></svg>
            <svg *ngSwitchCase="'graduation-cap'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M232,104.38l-98.81,56.46a16,16,0,0,1-15.84,0L32,112l91.1-52.05a16,16,0,0,1,15.8,0Z" opacity="0.2"></path><path d="M246.36,99.88l-105-60a24,24,0,0,0-23.7,0l-105,60A8,8,0,0,0,16.59,114L32,122.8V168a48.06,48.06,0,0,0,48,48h96a48.06,48.06,0,0,0,48-48V122.8l15.41-8.81A8,8,0,0,0,246.36,99.88ZM208,168a32,32,0,0,1-32,32H80a32,32,0,0,1-32-32V131.94l68.64,39.23a24,24,0,0,0,23.7,0L208,131.94Zm-79.62,17.43a8,8,0,0,1-7.9,0l-91.13-52L128.32,53.86a8,8,0,0,1,7.9,0L228.16,112Z"></path></svg>
            <svg *ngSwitchCase="'chart-bar'" xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="currentColor" viewBox="0 0 256 256"><path d="M224,208H200V88a8,8,0,0,0-8-8H152V40a8,8,0,0,0-8-8H96V208H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16Z" opacity="0.2"></path><path d="M224,200H208V88a16,16,0,0,0-16-16H160V40a16,16,0,0,0-16-16H96A16,16,0,0,0,80,40V200H32a8,8,0,0,0,0,16H224a8,8,0,0,0,0-16Zm-16,0H160V88h48ZM96,40h48V200H96Z"></path></svg>
          </ng-container>
        </div>
        <div>
          <p class="text-2xl font-bold tabular-nums">{{ value }}</p>
          <p class="text-xs font-medium text-muted-foreground">{{ label }}</p>
        </div>
      </div>
    </div>
  `,
})
export class StatCardComponent {
  @Input({ required: true }) icon!: string;
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
}

@Component({
  selector: "gn-stat-cards",
  standalone: true,
  imports: [CommonModule, StatCardComponent],
  template: `
    <div class="grid grid-cols-2 gap-4 sm:grid-cols-3">
      <gn-stat-card icon="stack" label="OVAs totales" [value]="totals.ovas"></gn-stat-card>
      
      <gn-stat-card *ngIf="scope === 'platform'" icon="users" label="Usuarios" [value]="totals.users || 0"></gn-stat-card>
      <gn-stat-card *ngIf="scope !== 'platform'" icon="graduation-cap" label="Alumnos vinculados" [value]="totals.students || 0"></gn-stat-card>
      
      <gn-stat-card icon="chart-bar" label="Alcance" [value]="scope === 'platform' ? 'Global' : 'Cohorte'"></gn-stat-card>
    </div>
  `,
})
export class StatCardsComponent {
  @Input({ required: true }) totals!: AnalyticsTotals;
  @Input() scope?: string;
}

@Component({
  selector: "gn-status-breakdown",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 text-sm font-semibold">OVAs por estado</h2>
      <div class="space-y-3">
        <div *ngFor="let item of statusEntries">
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
            <div
              class="h-full {{ item.meta.color }}"
              [style.width]="item.pct + '%'"
            ></div>
          </div>
        </div>
      </div>
    </div>
  `,
})
export class StatusBreakdownComponent {
  @Input({ required: true }) byStatus!: Record<string, number>;

  get total() {
    return Object.values(this.byStatus).reduce((a, b) => a + b, 0) || 1;
  }

  get statusEntries() {
    return Object.entries(STATUS_META).map(([key, meta]) => {
      const n = this.byStatus[key] || 0;
      const pct = Math.round((n / this.total) * 100);
      return { key, meta, n, pct };
    });
  }
}

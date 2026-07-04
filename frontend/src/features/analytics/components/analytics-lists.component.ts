import { ChangeDetectionStrategy, Component, Input } from "@angular/core";

import type { Creator, RecentOva } from "../lib/types";

const STATUS_BADGE: Record<string, string> = {
  listo: "bg-emerald-500/15 text-emerald-600",
  generando: "bg-amber-500/15 text-amber-600",
  borrador: "bg-slate-400/15 text-slate-500",
  error: "bg-red-500/15 text-red-600",
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-top-creators",
  imports: [],
  template: `
    <div class="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 text-sm font-semibold">Mayores creadores</h2>

      @if (creators.length === 0) {
        <p class="text-xs text-muted-foreground">Sin datos todavía.</p>
      }

      @if (creators.length > 0) {
        <ul class="space-y-2">
          @for (c of creators; track c; let i = $index) {
            <li class="flex items-center gap-3">
              <span
                class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary"
              >
                {{ i + 1 }}
              </span>
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">
                  {{ c.name || c.email }}
                </p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ c.email }}
                </p>
              </div>
              <span class="shrink-0 text-sm font-bold tabular-nums">
                {{ c.ova_count }}
              </span>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class TopCreatorsComponent {
  @Input({ required: true }) creators!: Creator[];
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-recent-ovas",
  imports: [],
  template: `
    <div class="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 text-sm font-semibold">Actividad reciente</h2>

      @if (ovas.length === 0) {
        <p class="text-xs text-muted-foreground">Sin OVAs recientes.</p>
      }

      @if (ovas.length > 0) {
        <ul class="divide-y divide-border/50">
          @for (o of ovas; track o) {
            <li class="flex items-center gap-3 py-2">
              <div class="min-w-0 flex-1">
                <p class="truncate text-sm font-medium">
                  {{ o.title || "Sin título" }}
                </p>
                <p class="truncate text-xs text-muted-foreground">
                  {{ o.owner_name }}
                </p>
              </div>
              <span
                class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {{
                  getStatusBadge(o.status)
                }}"
              >
                {{ o.status }}
              </span>
              <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
                {{ fmtDate(o.created_at) }}
              </span>
            </li>
          }
        </ul>
      }
    </div>
  `,
})
export class RecentOvasComponent {
  @Input({ required: true }) ovas!: RecentOva[];

  getStatusBadge(status: string) {
    return STATUS_BADGE[status] || "bg-muted text-muted-foreground";
  }

  fmtDate(iso?: string): string {
    if (!iso) return "—";
    try {
      return new Date(iso).toLocaleDateString("es-PE", {
        day: "2-digit",
        month: "short",
      });
    } catch {
      return "—";
    }
  }
}

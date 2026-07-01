import { CommonModule } from "@angular/common";
import { Component, Input } from "@angular/core";
import type { Creator, RecentOva } from "../lib/types";

const STATUS_BADGE: Record<string, string> = {
  listo: "bg-emerald-500/15 text-emerald-600",
  generando: "bg-amber-500/15 text-amber-600",
  borrador: "bg-slate-400/15 text-slate-500",
  error: "bg-red-500/15 text-red-600",
};

@Component({
  selector: "gn-top-creators",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 text-sm font-semibold">Mayores creadores</h2>
      
      <p *ngIf="creators.length === 0" class="text-xs text-muted-foreground">
        Sin datos todavía.
      </p>
      
      <ul *ngIf="creators.length > 0" class="space-y-2">
        <li *ngFor="let c of creators; let i = index" class="flex items-center gap-3">
          <span class="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
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
      </ul>
    </div>
  `,
})
export class TopCreatorsComponent {
  @Input({ required: true }) creators!: Creator[];
}

@Component({
  selector: "gn-recent-ovas",
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="rounded-2xl border border-border/60 bg-card p-5 shadow-sm">
      <h2 class="mb-4 text-sm font-semibold">Actividad reciente</h2>
      
      <p *ngIf="ovas.length === 0" class="text-xs text-muted-foreground">
        Sin OVAs recientes.
      </p>
      
      <ul *ngIf="ovas.length > 0" class="divide-y divide-border/50">
        <li *ngFor="let o of ovas" class="flex items-center gap-3 py-2">
          <div class="min-w-0 flex-1">
            <p class="truncate text-sm font-medium">
              {{ o.title || 'Sin título' }}
            </p>
            <p class="truncate text-xs text-muted-foreground">
              {{ o.owner_name }}
            </p>
          </div>
          <span
            class="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase {{ getStatusBadge(o.status) }}"
          >
            {{ o.status }}
          </span>
          <span class="shrink-0 text-xs tabular-nums text-muted-foreground">
            {{ fmtDate(o.created_at) }}
          </span>
        </li>
      </ul>
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

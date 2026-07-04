import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";

import { groupByPhase, type ResourceVM } from "../../lib/ova-job-view-model";

const MARK: Record<string, { icon: string; cls: string }> = {
  check: { icon: "✔", cls: "text-primary border-primary/20 bg-primary/10" },
  X: { icon: "✖", cls: "text-destructive border-destructive/20 bg-destructive/10" },
  generando: { icon: "…", cls: "text-primary border-primary/20 bg-primary/5 animate-pulse" },
  pendiente: { icon: "○", cls: "text-muted-foreground border-border bg-muted" },
};

const PHASE_EMOJI: Record<string, string> = { engage: "🎯", explore: "🔍" };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-creation-resource-list",
  imports: [CommonModule, ButtonComponent],
  template: `
    <div class="space-y-4">
      @for (g of groups; track g) {
        <div>
          <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            {{ phaseEmoji(g.phase) }} {{ g.phaseLabel }}
          </p>
          <ul class="space-y-1.5">
            @for (r of g.items; track r) {
              <li class="rounded-lg border border-border bg-background px-3 py-2">
                <div class="flex items-center gap-2.5">
                  @if (r.status === "X") {
                    <input
                      type="checkbox"
                      [checked]="selectedSet.has(r.id)"
                      (change)="onToggle.emit(r.id)"
                      class="shrink-0"
                    />
                  }
                  <span
                    class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[13px] font-bold"
                    [ngClass]="markCls(r.status)"
                  >
                    {{ markIcon(r.status) }}
                  </span>
                  <button
                    type="button"
                    [disabled]="r.status !== 'check'"
                    (click)="r.status === 'check' && onPreview.emit(r.id)"
                    class="flex-1 min-w-0 truncate text-left text-sm"
                    [class.text-foreground]="r.status === 'check'"
                    [class.hover:text-primary]="r.status === 'check'"
                    [class.text-muted-foreground]="r.status !== 'check'"
                    [class.font-semibold]="activeId() === r.id"
                    [class.text-primary]="activeId() === r.id"
                  >
                    {{ r.emoji }} {{ r.label }}
                  </button>
                  @if (r.status === "X") {
                    <gn-button
                      variant="outline"
                      size="sm"
                      (onClick)="onRetry.emit(r.id)"
                      class="shrink-0 text-destructive border-destructive/30"
                    >
                      Reintentar
                    </gn-button>
                  }
                </div>
                @if (r.status === "X") {
                  <p class="mt-1.5 pl-8 text-xs text-destructive">
                    Lo sentimos, hubo un error generando el recurso.
                    @if (r.error_id) {
                      <span class="font-mono"> Error ID: {{ r.error_id }}</span>
                    }
                  </p>
                }
              </li>
            }
          </ul>
        </div>
      }
    </div>
  `,
})
export class CreationResourceListComponent {
  readonly viewModel = input.required<ResourceVM[]>();
  readonly selectedIds = input<string[]>([]);
  readonly activeId = input<string | null>(null);
  readonly onToggle = output<string>();
  readonly onRetry = output<string>();
  readonly onPreview = output<string>();

  get groups() {
    return groupByPhase(this.viewModel());
  }

  get selectedSet() {
    return new Set(this.selectedIds());
  }

  phaseEmoji(phase: string) {
    return PHASE_EMOJI[phase] || "";
  }

  markIcon(status: string) {
    return MARK[status]?.icon || MARK["pendiente"].icon;
  }

  markCls(status: string) {
    return MARK[status]?.cls || MARK["pendiente"].cls;
  }
}

import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, computed, input, output } from "@angular/core";

import { IconComponent } from "@/core/components/icon.component";
import { ButtonComponent } from "@/core/components/ui/button.component";

import { groupByPhase, type ResourceVM } from "../../lib/ova-job-view-model";
import { PHASE_ICON_BY_KEY, resourceIconClass } from "../../lib/resource-icons";

const MARK_CLS: Record<string, string> = {
  X: "text-destructive border-destructive/30 bg-destructive/10",
  generando: "text-primary border-primary/30 bg-primary/10",
  pendiente: "text-muted-foreground border-border bg-muted/60",
  check: "text-primary border-primary/30 bg-primary/10",
};

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-creation-resource-list",
  imports: [CommonModule, ButtonComponent, IconComponent],
  styles: `
    @keyframes gn-dot-bounce {
      0%,
      80%,
      100% {
        opacity: 0.25;
        transform: translateY(0);
      }
      40% {
        opacity: 1;
        transform: translateY(-2px);
      }
    }
    .gn-status-dot {
      width: 3px;
      height: 3px;
      border-radius: 9999px;
      background: currentColor;
      animation: gn-dot-bounce 1.1s ease-in-out infinite;
    }
    .gn-status-dot:nth-child(2) {
      animation-delay: 0.15s;
    }
    .gn-status-dot:nth-child(3) {
      animation-delay: 0.3s;
    }
  `,
  template: `
    <div class="space-y-4">
      <!-- track por clave estable: los VMs se reconstruyen en cada tick del poll
           (2 s); track por identidad destruía la lista y mataba animate-pulse -->
      @for (g of groups(); track g.phase) {
        <div>
          <p class="mb-1.5 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <gn-icon [name]="phaseIcon(g.phase)" size="text-xs" /> {{ g.phaseLabel }}
          </p>
          <ul class="space-y-1.5">
            @for (r of g.items; track r.id) {
              <li class="rounded-lg border border-border bg-background px-3 py-2">
                <div class="flex items-center gap-2.5">
                  @if (r.status === "X") {
                    <input
                      type="checkbox"
                      [checked]="selectedSet().has(r.id)"
                      (change)="onToggle.emit(r.id)"
                      class="shrink-0"
                    />
                  }
                  <span
                    class="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full border"
                    [ngClass]="markCls(r.status)"
                    [attr.aria-label]="statusLabel(r.status)"
                  >
                    @if (r.status === "check") {
                      <gn-icon name="check" size="text-xs" weight="bold" />
                    } @else if (r.status === "X") {
                      <gn-icon name="x" size="text-xs" weight="bold" />
                    } @else {
                      <span class="inline-flex items-center gap-[3px]" aria-hidden="true">
                        <span class="gn-status-dot"></span>
                        <span class="gn-status-dot"></span>
                        <span class="gn-status-dot"></span>
                      </span>
                    }
                  </span>
                  <button
                    type="button"
                    [disabled]="r.status !== 'check'"
                    (click)="r.status === 'check' && onPreview.emit(r.id)"
                    class="flex-1 min-w-0 inline-flex items-center gap-1.5 text-left text-sm"
                    [class.text-foreground]="r.status === 'check'"
                    [class.hover:text-primary]="r.status === 'check'"
                    [class.text-muted-foreground]="r.status !== 'check'"
                    [class.font-semibold]="activeId() === r.id"
                    [class.text-primary]="activeId() === r.id"
                  >
                    <i class="{{ resourceIcon(r.label) }} shrink-0" aria-hidden="true"></i>
                    <span class="truncate">{{ r.label }}</span>
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

  readonly groups = computed(() => groupByPhase(this.viewModel()));

  readonly selectedSet = computed(() => new Set(this.selectedIds()));

  phaseIcon(phase: string) {
    return (PHASE_ICON_BY_KEY[phase] ?? "ph-circle").replace(/^ph-/, "");
  }

  resourceIcon(label: string) {
    return resourceIconClass(label);
  }

  markCls(status: string) {
    return MARK_CLS[status] || MARK_CLS["pendiente"];
  }

  statusLabel(status: string): string {
    if (status === "check") return "Generado";
    if (status === "X") return "Error";
    if (status === "generando") return "Generando";
    return "En espera";
  }
}

import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import { ButtonComponent } from "@/core/components/ui/button.component";

import type { JobLike, ResourceVM } from "../../lib/ova-job-view-model";
import { CreationResourceListComponent } from "./creation-resource-list.component";

const STATUS_LABEL: Record<string, string> = {
  queued: "En cola…",
  running: "Generando recursos…",
  interrupted: "Generación interrumpida",
  error: "La generación terminó con errores",
  done: "¡OVA generado!",
  canceled: "Generación cancelada",
};

const TERMINAL = new Set(["done", "error", "canceled", "interrupted"]);

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-progress-panel",
  imports: [ButtonComponent, CreationResourceListComponent],
  template: `
    <div class="rounded-xl border border-border bg-background p-4 sm:p-5 shadow-sm space-y-4">
      <div>
        <div class="flex flex-wrap items-center justify-between gap-2 text-sm">
          <span class="font-medium text-foreground">{{ statusLabel }}</span>
          <div class="flex items-center gap-2">
            @if (!isTerminal && showCancel()) {
              <gn-button
                variant="ghost"
                size="sm"
                (onClick)="onCancel.emit()"
                class="h-6 px-2 text-xs text-muted-foreground"
              >
                Cancelar
              </gn-button>
            }
            <span class="text-xs font-semibold text-muted-foreground">
              {{ doneCount }}/{{ viewModel().length }} listos
            </span>
          </div>
        </div>
        <div class="mt-2 h-2 w-full overflow-hidden rounded-full bg-muted">
          <div
            class="h-full rounded-full transition-[width] duration-500"
            [class.bg-accent-brand]="failedCount > 0"
            [class.bg-primary]="failedCount === 0"
            [style.width.%]="pct"
          ></div>
        </div>
      </div>

      @if (!isTerminal && isStalled()) {
        <div class="rounded-lg border border-accent-brand/30 bg-accent-brand/10 p-3 text-xs">
          <p class="font-medium text-foreground">
            La generación lleva un rato sin actividad — puedes seguir esperando, reanudar o
            cancelar.
          </p>
          <div class="mt-2 flex flex-wrap gap-2">
            <gn-button variant="outline" size="sm" (onClick)="onResume.emit()">
              Reanudar
            </gn-button>
            @if (showCancel()) {
              <gn-button
                variant="outline"
                size="sm"
                (onClick)="onCancel.emit()"
                class="text-muted-foreground"
              >
                Cancelar
              </gn-button>
            }
          </div>
        </div>
      }

      <gn-creation-resource-list
        [viewModel]="viewModel()"
        [selectedIds]="selectedIds()"
        [activeId]="activeId()"
        (onToggle)="onToggle.emit($event)"
        (onRetry)="onRetryOne.emit($event)"
        (onPreview)="onPreview.emit($event)"
      ></gn-creation-resource-list>

      @if (failedCount > 0) {
        <div class="flex flex-wrap items-center gap-2 border-t border-border pt-3">
          <gn-button variant="outline" size="sm" (onClick)="onSelectAll.emit()">
            Seleccionar todos los fallidos
          </gn-button>
          <gn-button
            variant="destructive"
            size="sm"
            [disabled]="selectedIds().length === 0"
            (onClick)="onRetrySelected.emit()"
          >
            Reintentar seleccionados ({{ selectedIds().length }})
          </gn-button>
        </div>
      }
    </div>
  `,
})
export class ProgressPanelComponent {
  readonly job = input<JobLike | null>(null);
  readonly viewModel = input.required<ResourceVM[]>();
  readonly selectedIds = input<string[]>([]);
  readonly activeId = input<string | null>(null);
  readonly showCancel = input(false);
  readonly isStalled = input(false);
  readonly onToggle = output<string>();
  readonly onRetryOne = output<string>();
  readonly onPreview = output<string>();
  readonly onSelectAll = output();
  readonly onRetrySelected = output();
  readonly onCancel = output();
  readonly onResume = output();

  get status() {
    return this.job()?.status || "queued";
  }

  get isTerminal() {
    return TERMINAL.has(this.status);
  }

  get statusLabel() {
    return STATUS_LABEL[this.status] || this.status;
  }

  get failedCount() {
    return this.viewModel().filter((r) => r.status === "X").length;
  }

  get doneCount() {
    return this.viewModel().filter((r) => r.status === "check").length;
  }

  get pct() {
    const total = this.viewModel().length || 1;
    return Math.round((this.doneCount / total) * 100);
  }
}

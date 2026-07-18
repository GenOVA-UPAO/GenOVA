import { ChangeDetectionStrategy, Component, inject, input, output } from "@angular/core";
import { Router } from "@angular/router";

import { BadgeComponent } from "@/core/components/ui/badge.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import type { OvaJobInfo } from "@/features/ova-library/lib/job-types";
import type { OvaListItem } from "@/features/ova-library/lib/types";

import { OvaCardShellComponent } from "./ova-card-shell.component";

export type { OvaJobInfo };

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-card",
  imports: [OvaCardShellComponent, ButtonComponent, BadgeComponent],
  template: `
    <gn-ova-card-shell
      [ova]="ova()"
      [isSelected]="isSelected()"
      (onToggleSelect)="onToggleSelect.emit($event)"
      [checkboxDisabled]="isGenerating"
      [dateValue]="formatDate(ova()['created_at'])"
    >
      <div extraBadges class="flex gap-1 items-center">
        @if (ova()["version_number"]) {
          <gn-badge variant="outline" class="text-[10px] text-muted-foreground">
            v{{ ova()["version_number"] }}
          </gn-badge>
        }
        @if (isGenerating && job()?.progress) {
          <gn-badge variant="outline" class="text-[10px] text-primary border-primary/30">
            {{ job()!.progress!.done }}/{{ job()!.progress!.total }}
          </gn-badge>
        }
      </div>

      <div footer class="flex flex-col gap-1.5 w-full">
        <!-- Generando: actions -->
        @if (isGenerating) {
          <div class="flex gap-2 mb-1.5">
            @if (job()?.isInterrupted) {
              <gn-button
                variant="outline"
                size="sm"
                class="flex-1 text-primary border-primary/30 hover:bg-primary/5"
                (onClick)="handleContinue()"
              >
                <!-- <Play /> -->
                Continuar
              </gn-button>
            }
            @if (!job()?.isInterrupted) {
              <gn-button
                variant="outline"
                size="sm"
                class="flex-1 text-primary border-primary/30 hover:bg-primary/5"
                (onClick)="handleResume()"
              >
                <!-- <Clock /> -->
                Reanudar / Ver progreso
              </gn-button>
            }
          </div>
        }

        <div class="grid grid-cols-2 gap-1.5 w-full">
          <gn-button
            variant="outline"
            size="sm"
            class="w-full min-w-0 truncate text-primary border-primary/30 hover:bg-primary/5"
            [disabled]="isGenerating || isDuplicating()"
            (onClick)="goToWorkspace()"
          >
            <!-- <PencilSimple /> -->
            Editar
          </gn-button>
          <gn-button
            variant="outline"
            size="sm"
            class="w-full min-w-0 truncate text-primary border-primary/30 hover:bg-primary/5"
            [disabled]="isGenerating || isDuplicating()"
            (onClick)="onEditMetadata.emit(ova())"
          >
            <!-- <FileText /> -->
            Metadatos
          </gn-button>
        </div>

        <div class="grid grid-cols-2 gap-1.5 w-full">
          <gn-button
            variant="outline"
            size="sm"
            class="w-full min-w-0 truncate"
            [disabled]="isGenerating || isDuplicating()"
            (onClick)="onDuplicate.emit(ova().id)"
          >
            <!-- <Copy /> -->
            {{ isDuplicating() ? "Duplicando..." : "Duplicar" }}
          </gn-button>
          <gn-button
            variant="outline"
            size="sm"
            class="w-full min-w-0 truncate"
            [disabled]="!isReady || isDownloading() || isDuplicating()"
            (onClick)="onDownload.emit({ id: ova().id, title: ova().title || '' })"
          >
            <!-- <DownloadSimple /> -->
            {{ isDownloading() ? "Descargando..." : "Descargar" }}
          </gn-button>
          <gn-button
            variant="outline"
            size="sm"
            class="col-span-2 w-full min-w-0 truncate text-destructive border-destructive/30 hover:bg-destructive/5"
            [disabled]="isGenerating || isMoving() || isDuplicating()"
            (onClick)="onMoveToTrash.emit(ova())"
            [attr.aria-label]="isMoving() ? 'Moviendo a papelera' : 'Enviar a papelera'"
          >
            <!-- <Trash /> -->
            {{ isMoving() ? "Moviendo..." : "A papelera" }}
          </gn-button>
        </div>
      </div>
    </gn-ova-card-shell>
  `,
})
export class OvaCardComponent {
  readonly ova = input.required<OvaListItem>();
  readonly job = input<OvaJobInfo | undefined>(undefined);
  readonly isSelected = input(false);
  readonly isMoving = input(false);
  readonly isDownloading = input(false);
  readonly isDuplicating = input(false);

  readonly onToggleSelect = output<string>();
  readonly onMoveToTrash = output<OvaListItem>();
  readonly onDownload = output<{
    id: string;
    title: string;
  }>();
  readonly onDuplicate = output<string>();
  readonly onEditMetadata = output<OvaListItem>();
  readonly onResume = output<string>();

  private router = inject(Router);

  get isGenerating(): boolean {
    return this.ova().status === "generando";
  }

  get isReady(): boolean {
    return this.ova().status === "listo";
  }

  formatDate(date: unknown): string {
    if (!date) return "";
    return new Date(date as string).toLocaleDateString();
  }

  handleResume() {
    // Progreso de generación = workspace del OVA, no /crear.
    void this.router.navigate(["/workspace", this.ova().id]);
  }

  handleContinue() {
    this.onResume.emit(this.ova().id);
    void this.router.navigate(["/workspace", this.ova().id]);
  }

  goToWorkspace() {
    void this.router.navigate([`/workspace/${this.ova().id}`]);
  }
}

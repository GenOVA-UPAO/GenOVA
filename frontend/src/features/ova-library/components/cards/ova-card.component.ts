import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import type { Router } from "@angular/router";
import { BadgeComponent } from "@/core/components/ui/badge.component";
import { ButtonComponent } from "@/core/components/ui/button.component";
import type { OvaListItem } from "@/features/ova-library/lib/types";
import { OvaCardShellComponent } from "./ova-card-shell.component";

export interface OvaJobInfo {
  jobId?: string | null;
  status?: string | null;
  progress?: { done: number; total: number } | null;
  isInterrupted?: boolean;
}

@Component({
  selector: "gn-ova-card",
  standalone: true,
  imports: [CommonModule, OvaCardShellComponent, ButtonComponent, BadgeComponent],
  template: `
    <gn-ova-card-shell
      [ova]="ova"
      [isSelected]="isSelected"
      (onToggleSelect)="onToggleSelect.emit($event)"
      [checkboxDisabled]="isGenerating"
      [dateValue]="formatDate(ova['created_at'])"
    >
      <div extraBadges class="flex gap-1 items-center">
        <gn-badge *ngIf="ova['version_number']" variant="outline" class="text-[10px] text-muted-foreground">
          v{{ ova['version_number'] }}
        </gn-badge>
        <gn-badge *ngIf="isGenerating && job?.progress" variant="outline" class="text-[10px] text-primary border-primary/30">
          {{ job!.progress!.done }}/{{ job!.progress!.total }}
        </gn-badge>
      </div>

      <div footer class="flex flex-col gap-1.5 w-full">
        <!-- Generando: actions -->
        <div *ngIf="isGenerating" class="flex gap-2 mb-1.5">
          <gn-button *ngIf="job?.isInterrupted" variant="outline" size="sm" class="flex-1 text-primary border-primary/30 hover:bg-primary/5" (onClick)="handleContinue()">
            <!-- <Play /> --> Continuar
          </gn-button>
          <gn-button *ngIf="!job?.isInterrupted" variant="outline" size="sm" class="flex-1 text-primary border-primary/30 hover:bg-primary/5" [disabled]="!job?.jobId" (onClick)="handleResume()">
            <!-- <Clock /> --> Reanudar / Ver progreso
          </gn-button>
        </div>

        <div class="flex items-center gap-1.5 w-full">
          <gn-button variant="outline" size="sm" class="flex-1 text-primary border-primary/30 hover:bg-primary/5" [disabled]="isGenerating || isDuplicating" (onClick)="goToWorkspace()">
            <!-- <PencilSimple /> --> Editar
          </gn-button>
          <gn-button variant="outline" size="sm" class="flex-1 text-primary border-primary/30 hover:bg-primary/5" [disabled]="isGenerating || isDuplicating" (onClick)="onEditMetadata.emit(ova)">
            <!-- <FileText /> --> Metadatos
          </gn-button>
        </div>

        <div class="flex flex-wrap items-center gap-1.5 w-full">
          <gn-button variant="outline" size="sm" class="flex-1" [disabled]="isGenerating || isDuplicating" (onClick)="onDuplicate.emit(ova.id)">
            <!-- <Copy /> --> {{ isDuplicating ? 'Duplicando...' : 'Duplicar' }}
          </gn-button>
          <gn-button variant="outline" size="sm" class="flex-1" [disabled]="!isReady || isDownloading || isDuplicating" (onClick)="onDownload.emit({ id: ova.id, title: ova.title || '' })">
            <!-- <DownloadSimple /> --> {{ isDownloading ? 'Descargando...' : 'Descargar' }}
          </gn-button>
          <gn-button variant="outline" size="sm" class="flex-1 text-destructive border-destructive/30 hover:bg-destructive/5" [disabled]="isGenerating || isMoving || isDuplicating" (onClick)="onMoveToTrash.emit(ova)">
            <!-- <Trash /> --> {{ isMoving ? 'Moviendo...' : 'Papelera' }}
          </gn-button>
        </div>
      </div>
    </gn-ova-card-shell>
  `,
})
export class OvaCardComponent {
  @Input({ required: true }) ova!: OvaListItem;
  @Input() job?: OvaJobInfo;
  @Input() isSelected = false;
  @Input() isMoving = false;
  @Input() isDownloading = false;
  @Input() isDuplicating = false;

  @Output() onToggleSelect = new EventEmitter<string>();
  @Output() onMoveToTrash = new EventEmitter<OvaListItem>();
  @Output() onDownload = new EventEmitter<{ id: string; title: string }>();
  @Output() onDuplicate = new EventEmitter<string>();
  @Output() onEditMetadata = new EventEmitter<OvaListItem>();
  @Output() onResume = new EventEmitter<string>();

  constructor(private router: Router) {}

  get isGenerating(): boolean {
    return this.ova.status === "generando";
  }

  get isReady(): boolean {
    return this.ova.status === "listo";
  }

  formatDate(date: unknown): string {
    if (!date) return "";
    return new Date(date as string).toLocaleDateString();
  }

  handleResume() {
    this.router.navigate(["/crear-ova"], { state: { resumeJobId: this.job?.jobId } });
  }

  async handleContinue() {
    this.onResume.emit(this.ova.id);
  }

  goToWorkspace() {
    this.router.navigate([`/ova/${this.ova.id}/workspace`]);
  }
}

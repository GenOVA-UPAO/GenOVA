import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";
import { FormsModule } from "@angular/forms";

import { ButtonComponent } from "@/core/components/ui/button.component";
import { CheckboxComponent } from "@/core/components/ui/checkbox.component";
import type { Phase } from "../../lib/types";
import type { UploadItem } from "../../lib/uploadTypes";
// Assume Textarea is just a normal native textarea for now, or we can make a directive. I will use standard html element with tailwind.
import { FileChipComponent } from "../shared/file-chip.component";

interface UploadsPropBag {
  uploads: UploadItem[];
  activeUploadsCount: number;
  maxUploadFiles: number;
  isUploadingFiles: boolean;
  uploadError: string;
  disabled?: boolean;
}

interface RegenProgress {
  percentage: number;
  stage: string;
}

@Component({
  selector: "gn-workspace-chat-panel",
  standalone: true,
  imports: [CommonModule, FormsModule, ButtonComponent, CheckboxComponent, FileChipComponent],
  template: `
    <div class="flex flex-col h-full overflow-hidden">
      <div class="flex-1 overflow-y-auto p-4 space-y-3">
        <p class="text-xs text-muted-foreground font-medium">
          Describe los cambios que quieres aplicar al OVA.
        </p>

        <div *ngIf="isRegenerating" class="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-1.5">
          <div class="flex items-center justify-between text-xs">
            <span class="font-medium text-primary truncate">
              {{ regenProgress.stage || 'Regenerando…' }}
            </span>
            <span class="font-bold text-primary tabular-nums">
              {{ regenProgress.percentage }}%
            </span>
          </div>
          <div class="h-1.5 w-full overflow-hidden rounded-full bg-primary/10">
            <div
              class="h-full rounded-full bg-primary transition-[width] duration-500"
              [style.width]="regenProgress.percentage + '%'"
            ></div>
          </div>
        </div>

        <gn-button
          *ngIf="canRegenAll"
          variant="outline"
          size="sm"
          class="w-full text-xs"
          (click)="onRegenAll.emit()"
          [disabled]="isRegenerating"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" class="mr-2"><path d="M224,128a96,96,0,0,1-94.71,96H128A95.38,95.38,0,0,1,62.1,196.44a8,8,0,1,1,11.8-10.88h0A79.4,79.4,0,0,0,128,208h1.07A80,80,0,0,0,208,128,80.11,80.11,0,0,0,128,48a79.29,79.29,0,0,0-58.11,25.32l10.45,10.45A8,8,0,0,1,74.69,97.43L26.69,81.43a8,8,0,0,1-5.26-10l16-48a8,8,0,0,1,15.15,5L43.83,54.21A95.37,95.37,0,0,1,128,32h0A96,96,0,0,1,224,128Z"></path></svg>
          Regenerar OVA completo
        </gn-button>

        <gn-button
          [variant]="selectionMode ? 'default' : 'outline'"
          size="sm"
          class="w-full text-xs"
          (click)="onToggleSelectionMode.emit()"
          [disabled]="isRegenerating"
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 256 256" class="mr-2"><path d="M224,64V192a16,16,0,0,1-16,16H48a16,16,0,0,1-16-16V64A16,16,0,0,1,48,48H208A16,16,0,0,1,224,64ZM48,64V192H208V64Z"></path></svg>
          {{ selectionMode ? 'Seleccionando recursos (' + selectedCount + ' elegido' + (selectedCount !== 1 ? 's' : '') + ')' : 'Seleccionar recursos' }}
        </gn-button>

        <div *ngIf="selectionMode && phases.length > 0" class="space-y-1.5">
          <div class="flex items-center justify-between">
            <p class="text-[10px] text-muted-foreground">
              El prompt aplicará solo a los recursos marcados.
            </p>
            <button
              *ngIf="canSelectAll"
              type="button"
              (click)="onSelectAll.emit()"
              class="text-[10px] font-medium text-primary hover:underline"
            >
              {{ allSelected ? 'Deseleccionar todas' : 'Seleccionar todas' }}
            </button>
          </div>
          <label
            *ngFor="let phase of phases"
            class="flex items-center gap-2 cursor-pointer rounded-md border border-border px-2 py-1.5 text-xs hover:bg-muted/50"
          >
            <gn-checkbox
              [checked]="selectedPhaseIds.includes(phase.id)"
              (checkedChange)="onTogglePhaseSelection.emit(phase.id)"
            ></gn-checkbox>
            <span class="capitalize">
              {{ phase.phase_type }}
            </span>
            <span *ngIf="phase.title" class="text-muted-foreground truncate">
              — {{ phase.title }}
            </span>
          </label>
        </div>
      </div>

      <div
        class="border-t border-border p-3 space-y-2"
        (dragover)="$event.preventDefault()"
        (drop)="handleDrop($event)"
      >
        <div *ngIf="uploads.uploads.length > 0" class="flex flex-wrap gap-2">
          <gn-file-chip
            *ngFor="let u of uploads.uploads"
            [file]="u"
            [disabled]="isRegenerating || uploads.disabled"
            (onRemove)="onRemoveFile.emit($event)"
          ></gn-file-chip>
        </div>

        <p *ngIf="uploads.uploadError" class="text-xs text-destructive">
          {{ uploads.uploadError }}
        </p>

        <div class="flex items-end gap-2">
          <div class="flex-1 relative">
            <textarea
              rows="3"
              [ngModel]="prompt"
              (ngModelChange)="promptChange.emit($event)"
              [placeholder]="promptPlaceholder"
              class="flex min-h-[60px] w-full rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 resize-none pr-8"
              [disabled]="isRegenerating"
              (keydown)="handleKeydown($event)"
            ></textarea>
            
            <input
              #fileInput
              type="file"
              multiple
              accept=".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp"
              class="hidden"
              (change)="handleFileChange($event)"
              [disabled]="isRegenerating || uploads.disabled || uploads.isUploadingFiles"
            />
            
            <gn-button
              type="button"
              variant="ghost"
              size="icon-sm"
              (click)="fileInput.click()"
              [disabled]="isRegenerating || !canUploadMore"
              title="Adjuntar archivo de apoyo"
              class="absolute right-1 bottom-1 h-6 w-6"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 256 256"><path d="M208.57,80.57l-96,96a20,20,0,0,1-28.28-28.28l96-96a12,12,0,0,1,17,17l-96,96a4,4,0,0,1-5.66-5.66l96-96a8,8,0,0,0-11.32-11.32l-96,96a20,20,0,0,0,28.28,28.28l96-96a28,28,0,1,0-39.6-39.6l-96,96a36,36,0,1,0,50.91,50.91l96-96a8,8,0,0,0-11.32-11.32Z"></path></svg>
            </gn-button>
          </div>
          <gn-button
            type="button"
            (click)="onSubmit.emit()"
            [disabled]="!prompt.trim() || isRegenerating"
            size="sm"
            class="shrink-0 self-end"
          >
            {{ isRegenerating ? 'Generando…' : 'Aplicar' }}
          </gn-button>
        </div>
        <p class="text-[10px] text-muted-foreground">
          Ctrl+Enter para enviar
        </p>
      </div>
    </div>
  `,
})
export class WorkspaceChatPanelComponent {
  @Input() prompt = "";
  @Input() isRegenerating = false;
  @Input() uploads!: UploadsPropBag;
  @Input() regenProgress!: RegenProgress;
  @Input() phases: Phase[] = [];
  @Input() selectionMode = false;
  @Input() selectedPhaseIds: string[] = [];

  // Feature flags derived from bound event emitters (simulated)
  @Input() canRegenAll = false;
  @Input() canSelectAll = false;

  @Output() promptChange = new EventEmitter<string>();
  @Output() onSubmit = new EventEmitter<void>();
  @Output() onRegenAll = new EventEmitter<void>();
  @Output() onToggleSelectionMode = new EventEmitter<void>();
  @Output() onTogglePhaseSelection = new EventEmitter<string>();
  @Output() onSelectAll = new EventEmitter<void>();

  @Output() onFilesSelected = new EventEmitter<FileList>();
  @Output() onRemoveFile = new EventEmitter<string>();

  get selectedCount() {
    return this.selectedPhaseIds?.length || 0;
  }

  get allSelected() {
    return this.phases.length > 0 && this.selectedCount === this.phases.length;
  }

  get canUploadMore() {
    return this.uploads.activeUploadsCount < this.uploads.maxUploadFiles;
  }

  get promptPlaceholder() {
    if (this.selectionMode && this.selectedCount > 0) {
      return `Cambio para ${this.selectedCount} recurso${this.selectedCount !== 1 ? "s" : ""}…`;
    }
    return "Escribe un cambio o mejora para el OVA…";
  }

  handleDrop(e: DragEvent) {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files?.length > 0) {
      this.onFilesSelected.emit(e.dataTransfer.files);
    }
  }

  handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      this.onFilesSelected.emit(input.files);
    }
    input.value = "";
  }

  handleKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      this.onSubmit.emit();
    }
  }
}

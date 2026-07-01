import { CommonModule } from "@angular/common";
import { Component, EventEmitter, Input, Output } from "@angular/core";

import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from "@/core/components/ui/dialog.component";
import type { UploadItem } from "../../lib/uploadTypes";
import { FileChipComponent } from "../shared/file-chip.component";

const ACCEPTED_LABEL = "PDF, DOCX, PPTX · MP3, WAV, M4A · JPG, PNG, WEBP";
const ACCEPTED_ATTR = ".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp";

@Component({
  selector: "gn-ova-files-modal",
  standalone: true,
  imports: [
    CommonModule,
    DialogComponent,
    DialogContentComponent,
    DialogHeaderComponent,
    DialogTitleComponent,
    DialogDescriptionComponent,
    FileChipComponent,
  ],
  template: `
    <gn-dialog [open]="open" (openChange)="onOpenChange.emit($event)">
      <gn-dialog-content class="max-w-md">
        <gn-dialog-header>
          <gn-dialog-title>Archivos de referencia</gn-dialog-title>
          <gn-dialog-description>
            {{ activeUploadsCount }} de {{ maxUploadFiles }} · la IA los usa como
            contexto RAG
          </gn-dialog-description>
        </gn-dialog-header>

        <div class="py-1 space-y-3">
          <input
            #fileInput
            type="file"
            multiple
            [accept]="ACCEPTED_ATTR"
            class="hidden"
            (change)="handleChange($event)"
          />
          <div
            (dragover)="handleDragOver($event)"
            (dragleave)="setDragging(false)"
            (drop)="handleDrop($event)"
            (click)="canAdd && fileInput.click()"
            [ngClass]="[
              'rounded-xl border-2 border-dashed transition duration-200 py-9 px-6',
              'flex flex-col items-center gap-2.5 text-center select-none',
              dragging
                ? 'border-primary bg-primary/5 scale-[1.01]'
                : canAdd
                  ? 'border-border hover:border-primary/50 hover:bg-accent/30 cursor-pointer'
                  : 'border-border/30 opacity-50 pointer-events-none'
            ]"
          >
            <div>
              <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 256 256" [class]="dragging ? 'text-primary transition-colors' : 'text-muted-foreground/60 transition-colors'"><path d="M125.17,90.83a4,4,0,0,1,5.66,0l24,24a4,4,0,0,1-5.66,5.66L132,103.66V168a4,4,0,0,1-8,0V103.66l-17.17,16.83a4,4,0,0,1-5.66-5.66ZM244,136v64a12,12,0,0,1-12,12H24a12,12,0,0,1-12-12V136a12,12,0,0,1,12-12H65.86A59.71,59.71,0,0,1,72,83.4V80a76,76,0,0,1,152,0v3.4A59.71,59.71,0,0,1,230.14,124H232A12,12,0,0,1,244,136Zm-8,64V136a4,4,0,0,0-4-4H223.11a4,4,0,0,1-3.66-2.31A52.06,52.06,0,0,0,172.93,100,53.4,53.4,0,0,0,166,100.22a4,4,0,0,1-4.22-2.5C155.67,82.49,142.14,72,128,72s-27.67,10.49-33.78,25.72a4,4,0,0,1-4.22,2.5,53.4,53.4,0,0,0-6.93-.22A52.06,52.06,0,0,0,36.55,129.69a4,4,0,0,1-3.66,2.31H20a4,4,0,0,0-4,4v64a4,4,0,0,0,4,4H232A4,4,0,0,0,236,200Z"></path></svg>
            </div>
            <div>
              <p class="text-sm font-semibold">
                {{ dragging ? 'Suelta aquí' : canAdd ? 'Arrastra archivos' : 'Límite alcanzado' }}
              </p>
              <p *ngIf="canAdd" class="text-xs text-muted-foreground mt-0.5">
                o haz clic para seleccionar
              </p>
              <p class="text-[10px] text-muted-foreground/60 mt-1.5">
                {{ ACCEPTED_LABEL }}
              </p>
            </div>
          </div>

          <div *ngIf="hasFiles" class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
            <gn-file-chip
              *ngFor="let u of uploads"
              [file]="u"
              (onRemove)="onRemove.emit($event)"
            ></gn-file-chip>
          </div>
          
          <p *ngIf="!hasFiles" class="text-center text-xs text-muted-foreground/50 py-1">
            Sin archivos · la IA generará sin contexto adicional
          </p>
        </div>
      </gn-dialog-content>
    </gn-dialog>
  `,
})
export class OvaFilesModalComponent {
  @Input() open = false;
  @Input() uploads: UploadItem[] = [];
  @Input() activeUploadsCount = 0;
  @Input() maxUploadFiles = 5;

  @Output() onOpenChange = new EventEmitter<boolean>();
  @Output() onFilesSelected = new EventEmitter<FileList | File[]>();
  @Output() onRemove = new EventEmitter<string>();

  ACCEPTED_LABEL = ACCEPTED_LABEL;
  ACCEPTED_ATTR = ACCEPTED_ATTR;
  dragging = false;

  get canAdd() {
    return this.activeUploadsCount < this.maxUploadFiles;
  }

  get hasFiles() {
    return this.uploads.length > 0;
  }

  setDragging(v: boolean) {
    this.dragging = v;
  }

  handleDragOver(e: DragEvent) {
    e.preventDefault();
    this.dragging = true;
  }

  handleDrop(e: DragEvent) {
    e.preventDefault();
    this.dragging = false;
    if (e.dataTransfer?.files?.length) {
      this.onFilesSelected.emit(e.dataTransfer.files);
    }
  }

  handleChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files?.length) {
      this.onFilesSelected.emit(input.files);
    }
    input.value = "";
  }
}

import { CommonModule } from "@angular/common";
import { ChangeDetectionStrategy, Component, input, output } from "@angular/core";

import {
  DialogComponent,
  DialogContentComponent,
  DialogDescriptionComponent,
  DialogHeaderComponent,
  DialogTitleComponent,
} from "@/core/components/ui/dialog.component";

import type { UploadItem } from "../../lib/upload-types";
import { FileChipComponent } from "../shared/file-chip.component";

const ACCEPTED_LABEL = "PDF, DOCX, PPTX · MP3, WAV, M4A · JPG, PNG, WEBP";
const ACCEPTED_ATTR = ".pdf,.docx,.pptx,.mp3,.wav,.m4a,.aac,.jpg,.jpeg,.png,.webp";

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: "gn-ova-files-modal",
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
    <gn-dialog [open]="open()" width="28rem" (openChange)="onOpenChange.emit($event)">
      <gn-dialog-content class="p-6">
        <gn-dialog-header>
          <gn-dialog-title>Archivos de referencia</gn-dialog-title>
          <gn-dialog-description>
            {{ activeUploadsCount() }} de {{ maxUploadFiles() }} · la IA los usa como contexto RAG
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
            role="button"
            [attr.tabindex]="canAdd ? 0 : -1"
            (keyup.enter)="canAdd && fileInput.click()"
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
                  : 'border-border/30 opacity-50 pointer-events-none',
            ]"
          >
            <div>
              <i
                class="ph ph-cloud-arrow-up text-4xl leading-none {{
                  dragging
                    ? 'text-primary transition-colors'
                    : 'text-muted-foreground/60 transition-colors'
                }}"
                aria-hidden="true"
              ></i>
            </div>
            <div>
              <p class="text-sm font-semibold">
                {{ dragging ? "Suelta aquí" : canAdd ? "Arrastra archivos" : "Límite alcanzado" }}
              </p>
              @if (canAdd) {
                <p class="text-xs text-muted-foreground mt-0.5">o haz clic para seleccionar</p>
              }
              <p class="text-[10px] text-muted-foreground/60 mt-1.5">
                {{ ACCEPTED_LABEL }}
              </p>
            </div>
          </div>

          @if (hasFiles) {
            <div class="space-y-1.5 max-h-44 overflow-y-auto pr-1">
              @for (u of uploads(); track u) {
                <gn-file-chip [file]="u" (onRemove)="onRemove.emit($event)"></gn-file-chip>
              }
            </div>
          }

          @if (!hasFiles) {
            <p class="text-center text-xs text-muted-foreground/50 py-1">
              Sin archivos · la IA generará sin contexto adicional
            </p>
          }
        </div>
      </gn-dialog-content>
    </gn-dialog>
  `,
})
export class OvaFilesModalComponent {
  readonly open = input(false);
  readonly uploads = input<UploadItem[]>([]);
  readonly activeUploadsCount = input(0);
  readonly maxUploadFiles = input(5);

  readonly onOpenChange = output<boolean>();
  readonly onFilesSelected = output<FileList | File[]>();
  readonly onRemove = output<string>();

  ACCEPTED_LABEL = ACCEPTED_LABEL;
  ACCEPTED_ATTR = ACCEPTED_ATTR;
  dragging = false;

  get canAdd() {
    return this.activeUploadsCount() < this.maxUploadFiles();
  }

  get hasFiles() {
    return this.uploads().length > 0;
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
